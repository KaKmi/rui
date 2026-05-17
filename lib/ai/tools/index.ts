/**
 * Rui 工具登记表。所有给到 streamText 的工具集中在这里。
 * M2.2 范围：generate_jd / match_candidates / summarize_pipeline
 * M3 起会加 score_resume / suggest_questions
 */
import { generateJD } from './generate-jd';
import { matchCandidates } from './match-candidates';
import { summarizePipeline } from './summarize-pipeline';

export const ruiTools = {
  generate_jd: generateJD,
  match_candidates: matchCandidates,
  summarize_pipeline: summarizePipeline,
} as const;

export type RuiToolName = keyof typeof ruiTools;
