import { create } from 'zustand';
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

type Store = {
  state: CanvasState;
  /** 直接替换；spec §6.6.1 切换无动画 */
  set: (state: CanvasState) => void;
  reset: () => void;
};

export const useCanvas = create<Store>((set) => ({
  state: { kind: 'empty' },
  set: (state) => set({ state }),
  reset: () => set({ state: { kind: 'empty' } }),
}));

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
