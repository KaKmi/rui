import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { JDDraftData } from '@/app/chat/canvas/JDDraft';
import type { MatchListData } from '@/app/chat/canvas/Recommendation';
import type { PipelineReportData } from '@/app/chat/canvas/Report';
import type { QuestionSetData } from '@/app/chat/canvas/QuestionSet';
import type { ResumeResultsData } from '@/app/chat/canvas/ResumeScan.client';

/**
 * spec §6.6.1 右侧画布 kind 状态机。
 *
 * 注意：spec §6.6.1 原本列了 8 种 kind 含 `jd-form`，但 jd-form 在 M2.3 实现里
 * 被「HITL 访谈工具」（ask_role / ask_level / ... 6 个 widget 内嵌在 chat 气泡）
 * 替代 —— 画布不再承载 JD 信息收集，只承载生成结果 (jd-draft)。
 *
 * 来源：
 *   1. LLM tool 返回 → ChatStream 监听到 tool-output-available 后写入
 *   2. 用户 UI 动作（点 QuickPrompt / 上传按钮等）→ 直接 set
 *
 * 持久化策略（用户选了：1 个会话 + 关闭=隐藏 + 可恢复）：
 *   - 落地的 state 会被 localStorage 持久化，跨刷新存活
 *   - resume-upload / resume-scan 是瞬态（依赖会话内的 File 引用 / SSE 连接），
 *     刷新后无法复原，所以在持久化时被剥掉
 *   - hidden = true 表示用户主动关了画布，但 state 仍保留，给「恢复画布」按钮用
 */

export type CanvasState =
  | { kind: 'empty' }
  | { kind: 'jd-draft'; data: JDDraftData }
  | { kind: 'resume-upload'; jobId?: string }
  | { kind: 'resume-scan'; taskId: string; resumeIds: string[]; jobId?: string }
  | { kind: 'resume-results'; data: ResumeResultsData }
  | { kind: 'match-list'; data: MatchListData }
  | { kind: 'pipeline-report'; data: PipelineReportData }
  | { kind: 'question-set'; data: QuestionSetData };

export type CanvasKind = CanvasState['kind'];

const TRANSIENT_KINDS: ReadonlySet<CanvasKind> = new Set<CanvasKind>([
  'resume-upload',
  'resume-scan',
]);

type Store = {
  state: CanvasState;
  hidden: boolean;
  /** 替换画布 state，并自动取消"隐藏"，spec §6.6.1 切换无动画 */
  set: (state: CanvasState) => void;
  /** 清空 state + 取消隐藏 */
  reset: () => void;
  /** 隐藏画布但保留 state，让"恢复画布"按钮能拉回来；state.kind === 'empty' 时不做任何事 */
  hide: () => void;
  /** 取消隐藏。state.kind === 'empty' 时仍是空 */
  restore: () => void;
};

export const useCanvas = create<Store>()(
  persist(
    (set) => ({
      state: { kind: 'empty' },
      hidden: false,
      set: (state) => set({ state, hidden: false }),
      reset: () => set({ state: { kind: 'empty' }, hidden: false }),
      hide: () =>
        set((s) => (s.state.kind === 'empty' ? s : { ...s, hidden: true })),
      restore: () => set({ hidden: false }),
    }),
    {
      name: 'rui:canvas',
      storage: createJSONStorage(() => localStorage),
      // 瞬态 kind（依赖会话内 File 引用 / SSE 连接）刷新后恢复不了，剥掉
      partialize: (s) => ({
        state: TRANSIENT_KINDS.has(s.state.kind) ? { kind: 'empty' as const } : s.state,
        hidden: TRANSIENT_KINDS.has(s.state.kind) ? false : s.hidden,
      }),
      // SSR 和首屏 hydration 阶段不要读 localStorage，否则会跟服务端 HTML 对不上。
      // ChatStream 在 useEffect 里手动调 useCanvas.persist.rehydrate() 触发恢复。
      skipHydration: true,
    },
  ),
);

/** 标题映射 —— spec §6.6.1 表头 */
export function canvasTitle(state: CanvasState): string {
  switch (state.kind) {
    case 'empty':
      return 'Workspace';
    case 'jd-draft':
      return `JD · ${state.data.meta.title}`;
    case 'resume-upload':
      return '简历批量上传';
    case 'resume-scan':
      return 'AI 评分进行中';
    case 'resume-results':
      return '本批简历评分结果';
    case 'match-list':
      return '候选人智能推荐';
    case 'pipeline-report':
      return '招聘漏斗 · 当前';
    case 'question-set':
      return '面试追问清单';
  }
}
