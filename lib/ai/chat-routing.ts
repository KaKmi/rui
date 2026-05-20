import type { RuiToolName } from './tools';

type ForcedToolName = Extract<
  RuiToolName,
  'match_candidates' | 'score_resume' | 'suggest_questions' | 'summarize_pipeline'
>;

export type ForcedToolRoute = {
  toolName: ForcedToolName;
  reason: string;
  instruction: string;
};

const JD_ID_RE = /\bJD-\d{4}-\d{4}\b/i;
const RESUME_ID_RE = /\bR-[A-Z0-9][A-Z0-9-]{3,}\b/i;

function normalizeId(id: string): string {
  return id.toUpperCase();
}

function parseTopK(text: string): number {
  const match = text.match(/\btop\s*(\d{1,2})\b/i) ?? text.match(/前\s*(\d{1,2})\s*(?:个|位|名)?/);
  const value = match?.[1] ? Number.parseInt(match[1], 10) : 5;
  if (!Number.isFinite(value)) return 5;
  return Math.max(1, Math.min(20, value));
}

export function inferForcedToolRoute(text: string): ForcedToolRoute | null {
  const normalized = text.trim();
  if (!normalized) return null;

  const jdId = normalized.match(JD_ID_RE)?.[0];
  const resumeId = normalized.match(RESUME_ID_RE)?.[0];

  if (
    jdId &&
    /(候选人|简历|匹配|推荐|排序|排行|排名|top|Top|TOP)/.test(normalized)
  ) {
    const topK = parseTopK(normalized);
    const jobId = normalizeId(jdId);
    return {
      toolName: 'match_candidates',
      reason: 'explicit_job_match_request',
      instruction:
        `本轮用户明确要求对 ${jobId} 做候选人匹配/排序。` +
        `必须调用 match_candidates，参数 jobId="${jobId}"，topK=${topK}。` +
        '不要直接编候选人名单。',
    };
  }

  if (resumeId && /(追问|面试|讨论|聊聊|问什么|问题)/.test(normalized)) {
    const id = normalizeId(resumeId);
    return {
      toolName: 'suggest_questions',
      reason: 'explicit_resume_question_request',
      instruction:
        `本轮用户明确要求围绕简历 ${id} 生成面试追问。` +
        `必须调用 suggest_questions，参数 resumeId="${id}"。不要重新评分，也不要直接编追问清单。`,
    };
  }

  if (resumeId && /(评分|评估|扫描|打分|score)/i.test(normalized)) {
    const id = normalizeId(resumeId);
    return {
      toolName: 'score_resume',
      reason: 'explicit_resume_score_request',
      instruction:
        `本轮用户明确要求评分/评估简历 ${id}。` +
        `必须调用 score_resume，参数 resumeId="${id}"。不要直接编评分结果。`,
    };
  }

  if (/(漏斗|进展|汇总|复盘|pipeline)/i.test(normalized)) {
    return {
      toolName: 'summarize_pipeline',
      reason: 'explicit_pipeline_request',
      instruction: '本轮用户明确要求招聘漏斗/进展汇总。必须调用 summarize_pipeline，不要直接编漏斗数据。',
    };
  }

  return null;
}
