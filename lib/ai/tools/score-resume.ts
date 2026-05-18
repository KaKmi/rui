import { Prisma } from '@prisma/client';
import { generateObject, tool } from 'ai';
import { z } from 'zod';
import { mimoModel } from '@/lib/ai/mimo';
import { redactResumeForLLM } from '@/lib/ai/pii';
import { prisma } from '@/lib/db';
import { log } from '@/lib/log';

const modelNumber = (min: number, max: number) =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const n = Number.parseFloat(value.replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : value;
  }, z.number().min(min).max(max));

const nullableModelNumber = (min: number, max: number) =>
  z.preprocess((value) => {
    if (value == null) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed || ['未知', '未提及', '无', '暂无'].includes(trimmed)) return null;
      const n = Number.parseFloat(trimmed.replace(/[^\d.-]/g, ''));
      return Number.isFinite(n) ? n : value;
    }
    return value;
  }, z.number().min(min).max(max).nullable());

const scoreNumber = modelNumber(0, 100);

export const scoreResumeOutputSchema = z.object({
  name: z.string().min(1).max(40),
  edu: z.string().max(80).nullable(),
  yoe: nullableModelNumber(0, 50),
  current: z.string().max(80).nullable(),
  expected: z.string().max(40).nullable(),
  location: z.string().max(40).nullable(),
  score: scoreNumber,
  breakdown: z.object({
    skill: scoreNumber,
    experience: scoreNumber,
    education: scoreNumber,
    project: scoreNumber,
    stability: scoreNumber,
  }),
  summary: z.string().min(1).max(220),
  pros: z.array(z.string().min(1).max(90)).min(1).max(4),
  cons: z.array(z.string().min(1).max(90)).min(0).max(4),
  interview: z.array(z.string().min(1).max(140)).min(2).max(5),
  skills: z.array(z.string().min(1).max(28)).min(0).max(12),
  workHistory: z
    .array(
      z.object({
        co: z.string().min(1).max(60),
        title: z.string().min(1).max(60),
        dur: z.string().min(1).max(32),
      }),
    )
    .max(6),
});

export type ScoreResumeOutput = z.infer<typeof scoreResumeOutputSchema>;

export type ScoreResumeStep = 'load' | 'redact' | 'llm' | 'save' | 'done';

export type ScoredResumeResult = {
  id: string;
  jobId: string;
  fileName: string | null;
  name: string;
  score: number;
  summary: string;
  current: string | null;
  expected: string | null;
  location: string | null;
  yoe: number | null;
  status: 'AI 已评分';
};

function asJson<T>(value: T): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeNullableString(value: string | null): string | null {
  const next = value?.trim();
  if (!next || ['未知', '未提及', '无', '暂无'].includes(next)) return null;
  return next;
}

function normalizeList(values: string[], max: number): string[] {
  return values.map((v) => v.trim()).filter(Boolean).slice(0, max);
}

function normalizeOutput(output: ScoreResumeOutput, candidateLabel: string): ScoreResumeOutput {
  return {
    ...output,
    name: candidateLabel,
    edu: normalizeNullableString(output.edu),
    current: normalizeNullableString(output.current),
    expected: normalizeNullableString(output.expected),
    location: normalizeNullableString(output.location),
    yoe: output.yoe == null ? null : Math.max(0, Math.min(50, Math.round(output.yoe))),
    score: clampScore(output.score),
    breakdown: {
      skill: clampScore(output.breakdown.skill),
      experience: clampScore(output.breakdown.experience),
      education: clampScore(output.breakdown.education),
      project: clampScore(output.breakdown.project),
      stability: clampScore(output.breakdown.stability),
    },
    summary: output.summary.trim(),
    pros: normalizeList(output.pros, 4),
    cons: normalizeList(output.cons, 4),
    interview: normalizeList(output.interview, 5),
    skills: normalizeList(output.skills, 12),
    workHistory: output.workHistory
      .map((w) => ({
        co: w.co.trim(),
        title: w.title.trim(),
        dur: w.dur.trim(),
      }))
      .filter((w) => w.co && w.title && w.dur)
      .slice(0, 6),
  };
}

function buildScoringPrompt(input: {
  resumeId: string;
  candidateLabel: string;
  resumeText: string;
  job: {
    id: string;
    title: string;
    dept: string;
    level: string;
    location: string;
    salary: string;
    skills: string[];
    description: string;
    responsibilities: string[];
    requirements: string[];
    nice: string[];
  };
}): string {
  const { job } = input;
  return `你是 Rui 的结构化简历评分器。请基于“岗位要求”和“已脱敏简历文本”输出 JSON。

硬性规则：
- name 必须严格等于 "${input.candidateLabel}"，不要输出或还原候选人真实姓名。
- 不要输出年龄、性别、电话、邮箱、身份证、微信等个人敏感信息。
- 只根据岗位相关证据评分，不使用性别、年龄、婚育、民族、籍贯等敏感属性。
- yoe、score、breakdown 里的所有字段必须是 JSON number，不要写成字符串，不要带“年”或百分号。
- expected 只填写简历里明确出现的期望薪资；没有就填 null，不要填写期望岗位。
- 低分也只写客观风险点，不要写“建议拒绝 / 淘汰 / 不予录用 / pass / 拒绝 / 不录用”。
- 如果简历信息缺失，在 cons 中说明“材料未体现...”。

岗位：
- ID：${job.id}
- 名称：${job.title}
- 部门：${job.dept}
- 职级：${job.level}
- 地点：${job.location}
- 薪资：${job.salary}
- 关键词：${job.skills.join('、') || '未配置'}
- 描述：${job.description || '未配置'}
- 职责：${job.responsibilities.join('；') || '未配置'}
- 要求：${job.requirements.join('；') || '未配置'}
- 加分项：${job.nice.join('；') || '未配置'}

已脱敏简历文本：
${input.resumeText}`;
}

export async function scoreResumeText(input: {
  resumeId: string;
  rawText: string;
  job: Parameters<typeof buildScoringPrompt>[0]['job'];
}): Promise<ScoreResumeOutput> {
  const redacted = redactResumeForLLM(input.rawText, input.resumeId);
  console.log('Redacted resume text\n \n', { redacted});
  log.info('score/start', {
    resumeId: input.resumeId,
    jobId: input.job.id,
    redaction: redacted.stats,
  });

  const result = await generateObject({
    model: mimoModel,
    schema: scoreResumeOutputSchema,
    schemaName: 'score_resume',
    schemaDescription:
      'Rui resume scoring result with five 0-100 dimensions, neutral summary, pros, cons, and interview questions.',
    prompt: buildScoringPrompt({
      resumeId: input.resumeId,
      candidateLabel: redacted.candidateLabel,
      resumeText: redacted.text,
      job: input.job,
    }),
    temperature: 0.2,
    maxOutputTokens: 1800,
    experimental_repairText: async ({ text }) => {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start >= 0 && end > start) return text.slice(start, end + 1);
      return null;
    },
  });

  const output = normalizeOutput(result.object, redacted.candidateLabel);
  log.info('score/finish', {
    resumeId: input.resumeId,
    jobId: input.job.id,
    finishReason: result.finishReason,
    tokens: result.usage,
    output,
  });
  return output;
}

export async function scoreResumeRecord(
  resumeId: string,
  options: { onStep?: (step: ScoreResumeStep) => void | Promise<void> } = {},
): Promise<ScoredResumeResult> {
  await options.onStep?.('load');
  const row = await prisma.resume.findUnique({
    where: { id: resumeId },
    include: { appliedFor: true },
  });
  if (!row) throw new Error(`Resume not found: ${resumeId}`);
  if (!row.parsedText?.trim()) {
    throw new Error('Resume has no parsed text to score');
  }

  await options.onStep?.('redact');
  const job = {
    id: row.appliedFor.id,
    title: row.appliedFor.title,
    dept: row.appliedFor.dept,
    level: row.appliedFor.level,
    location: row.appliedFor.location,
    salary: row.appliedFor.salary,
    skills: row.appliedFor.skills,
    description: row.appliedFor.description,
    responsibilities: row.appliedFor.responsibilities,
    requirements: row.appliedFor.requirements,
    nice: row.appliedFor.nice,
  };

  await options.onStep?.('llm');
  const output = await scoreResumeText({
    resumeId,
    rawText: row.parsedText,
    job,
  });

  await options.onStep?.('save');
  await prisma.resume.update({
    where: { id: resumeId },
    data: {
      status: 'AI 已评分',
      name: output.name,
      gender: null,
      age: null,
      edu: output.edu,
      yoe: output.yoe,
      current: output.current,
      expected: output.expected,
      location: output.location,
      score: output.score,
      breakdown: asJson(output.breakdown),
      summary: output.summary,
      pros: output.pros,
      cons: output.cons,
      interview: output.interview,
      skills: output.skills,
      workHistory: output.workHistory.length > 0 ? asJson(output.workHistory) : Prisma.DbNull,
    },
  });

  await options.onStep?.('done');
  return {
    id: row.id,
    jobId: row.appliedForId,
    fileName: row.originalFileName,
    name: output.name,
    score: output.score,
    summary: output.summary,
    current: output.current,
    expected: output.expected,
    location: output.location,
    yoe: output.yoe,
    status: 'AI 已评分',
  };
}

export const scoreResume = tool({
  description:
    '对已上传且已解析的单份简历执行 AI 评分，并写回数据库。需要用户给出明确的简历 ID，例如 R-XXXX。',
  inputSchema: z.object({
    resumeId: z.string().min(1).describe('简历业务 ID，例如 R-9821'),
  }),
  execute: async ({ resumeId }) => {
    try {
      const result = await scoreResumeRecord(resumeId);
      return {
        kind: 'resume-results' as const,
        taskId: `manual-${resumeId}`,
        jobId: result.jobId,
        total: 1,
        ok: 1,
        failed: 0,
        results: [result],
      };
    } catch (e) {
      return {
        kind: 'error' as const,
        message: e instanceof Error ? e.message : String(e),
      };
    }
  },
});
