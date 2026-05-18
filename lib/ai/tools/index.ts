/**
 * Rui 工具登记表。所有给到 streamText 的工具集中在这里。
 *
 * 分两类：
 *   1. **服务端工具**（有 execute）：generate_jd / match_candidates / summarize_pipeline
 *      —— 模型调用 → 服务端运行 → 结果回到模型
 *   2. **HITL 工具**（无 execute，有 outputSchema）：ask_role / ask_level / ...
 *      —— 模型调用 → 前端 widget → 用户选 → addToolResult 回到模型
 *
 * M3 起会加 score_resume / suggest_questions（属于第 1 类）。
 */
import { generateJD } from './generate-jd';
import { matchCandidates } from './match-candidates';
import { scoreResume } from './score-resume';
import { summarizePipeline } from './summarize-pipeline';
import {
  askRole,
  askLevel,
  askLocation,
  askSalary,
  askSkills,
  askHeadcount,
} from './jd-interview';

export const ruiTools = {
  // 数据/生成类（server execute）
  generate_jd: generateJD,
  match_candidates: matchCandidates,
  summarize_pipeline: summarizePipeline,
  score_resume: scoreResume,
  // JD 收集类（HITL，前端回灌）
  ask_role: askRole,
  ask_level: askLevel,
  ask_location: askLocation,
  ask_salary: askSalary,
  ask_skills: askSkills,
  ask_headcount: askHeadcount,
} as const;

export type RuiToolName = keyof typeof ruiTools;

/** 哪些工具是 HITL（前端要为它们 render widget） */
export const HITL_TOOLS = new Set<RuiToolName>([
  'ask_role',
  'ask_level',
  'ask_location',
  'ask_salary',
  'ask_skills',
  'ask_headcount',
]);
