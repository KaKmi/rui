import { create } from 'zustand';
import type { JDDraftData } from '@/app/chat/canvas/JDDraft';
import type { MatchListData } from '@/app/chat/canvas/Recommendation';
import type { PipelineReportData } from '@/app/chat/canvas/Report';

/**
 * spec §6.6.1 右侧画布 8 种 kind 状态机。
 * 切换规则：新 kind 直接替换旧 kind，不做动画堆叠，瞬间出现。
 * 来源：
 *   1. LLM tool 返回 → ChatStream 监听到 tool-output-available 后写入
 *   2. 用户 UI 动作（点 QuickPrompt / 上传按钮等）→ 直接 set
 */

export type JDFormDefaults = {
  title?: string;
  dept?: string;
  level?: string;
  location?: string;
  salary?: string;
  headcount?: number;
  mustHave?: string[];
  niceToHave?: string[];
  extra?: string;
};

export type CanvasState =
  | { kind: 'empty' }
  | { kind: 'jd-form'; defaults?: JDFormDefaults }
  | { kind: 'jd-draft'; data: JDDraftData }
  | { kind: 'resume-upload'; jobId?: string }
  | { kind: 'resume-scan'; taskId: string }
  | { kind: 'resume-results'; data: unknown }
  | { kind: 'match-list'; data: MatchListData }
  | { kind: 'pipeline-report'; data: PipelineReportData };

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
    case 'jd-form':
      return 'JD · 信息收集';
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
  }
}
