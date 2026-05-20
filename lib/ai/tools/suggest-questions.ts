import { generateObject, tool } from 'ai';
import { z } from 'zod';
import { mimoModel } from '@/lib/ai/mimo';
import { prisma } from '@/lib/db';
import { truncateText } from '@/lib/display';
import { log } from '@/lib/log';
import type { ResumeBreakdown } from '@/types';

const modelString = (max: number) =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    return value.trim();
  }, z.string().min(1).max(max));

const modelStringList = (maxItem: number, maxItems: number) =>
  z.preprocess((value) => {
    if (!Array.isArray(value)) return [];
    return value;
  }, z.array(modelString(maxItem)).max(maxItems));

const suggestedQuestionSchema = z.object({
  area: modelString(80),
  question: modelString(500),
  why: modelString(500),
  signals: modelStringList(160, 3),
});

const suggestQuestionsOutputSchema = z.object({
  overview: modelString(800),
  questions: z.array(suggestedQuestionSchema).min(3).max(6),
});

export type SuggestedQuestion = z.infer<typeof suggestedQuestionSchema>;

export type QuestionSetData = {
  kind: 'question-set';
  resume: {
    id: string;
    name: string;
    score: number | null;
    summary: string;
  };
  job: {
    id: string;
    title: string;
    dept: string;
  };
  overview: string;
  questions: SuggestedQuestion[];
};

function normalizeQuestion(q: SuggestedQuestion): SuggestedQuestion {
  return {
    area: truncateText(q.area, 24),
    question: truncateText(q.question, 140),
    why: truncateText(q.why, 120),
    signals: q.signals.map((s) => truncateText(s, 56)).filter(Boolean).slice(0, 3),
  };
}

function fallbackQuestions(input: {
  cons: string[];
  interview: string[];
  jobTitle: string;
}): SuggestedQuestion[] {
  const fromExisting = input.interview.slice(0, 3).map((question, idx) => ({
    area: idx === 0 ? '经验验证' : idx === 1 ? '能力边界' : '岗位匹配',
    question,
    why: input.cons[idx] ?? `围绕 ${input.jobTitle} 的关键要求做现场验证。`,
    signals: ['能给出具体场景', '能说明个人负责边界', '能复盘取舍和结果'],
  }));

  const base = [
    {
      area: '岗位匹配',
      question: `请挑一个最接近 ${input.jobTitle} 的项目，说明你的职责、难点和结果。`,
      why: '验证简历摘要里的项目经验是否能支撑目标岗位要求。',
      signals: ['职责清晰', '指标具体', '能解释关键取舍'],
    },
    {
      area: '技术深度',
      question: '最近一次你主导解决的复杂问题是什么？为什么复杂，最后怎么衡量效果？',
      why: '验证技术深度和问题拆解能力，避免只停留在工具使用层面。',
      signals: ['问题定义清楚', '方案有备选比较', '结果可量化'],
    },
    {
      area: '协作方式',
      question: '遇到产品、设计或后端目标不一致时，你通常怎么推进决策？',
      why: '验证跨团队沟通方式和推进能力。',
      signals: ['能识别冲突来源', '有推进机制', '有复盘意识'],
    },
  ];

  return [...fromExisting, ...base].slice(0, 5).map(normalizeQuestion);
}

function buildPrompt(input: {
  resume: {
    id: string;
    score: number | null;
    edu: string | null;
    yoe: number | null;
    current: string | null;
    expected: string | null;
    location: string | null;
    summary: string | null;
    pros: string[];
    cons: string[];
    interview: string[];
    skills: string[];
    breakdown: ResumeBreakdown | null;
  };
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
  return `你是 Rui 的面试追问规划器。请基于岗位和已脱敏的评分信息，生成 3-6 个面试追问。

硬性规则：
- 所有问题必须围绕岗位能力、项目证据、协作方式、稳定性或风险点验证。
- 禁止询问或暗示年龄、性别、婚育、民族、籍贯、身份证、健康、宗教等敏感信息。
- 不要输出录用/拒绝建议，不要使用“淘汰 / 不予录用 / pass / 拒绝 / 不录用”。
- 每个 question 必须是一句可直接问候选人的中文问题。
- why 说明为什么要问，signals 给出 1-3 个面试官应观察的回答信号。

岗位信息：
${JSON.stringify(input.job, null, 2)}

候选人评分信息（已脱敏）：
${JSON.stringify(input.resume, null, 2)}`;
}

export async function suggestQuestionsForResume(resumeId: string): Promise<QuestionSetData> {
  const row = await prisma.resume.findUnique({
    where: { id: resumeId },
    include: { appliedFor: true },
  });
  if (!row) throw new Error(`Resume not found: ${resumeId}`);
  if (row.score == null && !row.summary && row.interview.length === 0) {
    throw new Error(`Resume ${resumeId} has not been scored yet`);
  }

  const job = row.appliedFor;
  const resume = {
    id: row.id,
    score: row.score,
    edu: row.edu,
    yoe: row.yoe,
    current: row.current,
    expected: row.expected,
    location: row.location,
    summary: row.summary,
    pros: row.pros,
    cons: row.cons,
    interview: row.interview,
    skills: row.skills,
    breakdown: row.breakdown ? (row.breakdown as unknown as ResumeBreakdown) : null,
  };

  log.info('questions/start', { resumeId: row.id, jobId: job.id });
  try {
    const result = await generateObject({
      model: mimoModel,
      schema: suggestQuestionsOutputSchema,
      schemaName: 'suggest_questions',
      schemaDescription:
        'Interview follow-up questions for one scored resume, including why each question matters and what signals to listen for.',
      prompt: buildPrompt({
        resume,
        job: {
          id: job.id,
          title: job.title,
          dept: job.dept,
          level: job.level,
          location: job.location,
          salary: job.salary,
          skills: job.skills,
          description: job.description,
          responsibilities: job.responsibilities,
          requirements: job.requirements,
          nice: job.nice,
        },
      }),
      temperature: 0.2,
      maxOutputTokens: 1400,
      experimental_repairText: async ({ text }) => {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start >= 0 && end > start) return text.slice(start, end + 1);
        return null;
      },
    });

    const questions = result.object.questions.map(normalizeQuestion).filter((q) => q.question);
    log.info('questions/finish', {
      resumeId: row.id,
      jobId: job.id,
      finishReason: result.finishReason,
      tokens: result.usage,
      count: questions.length,
    });

    return {
      kind: 'question-set',
      resume: {
        id: row.id,
        name: row.name?.trim() || `候选人 ${row.id}`,
        score: row.score,
        summary: truncateText(row.summary, 80, '暂无摘要'),
      },
      job: { id: job.id, title: job.title, dept: job.dept },
      overview: truncateText(result.object.overview, 180),
      questions: questions.length >= 3
        ? questions.slice(0, 6)
        : fallbackQuestions({
            cons: row.cons,
            interview: row.interview,
            jobTitle: job.title,
          }),
    };
  } catch (e) {
    log.warn('questions/fallback', {
      resumeId: row.id,
      jobId: job.id,
      err: e instanceof Error ? e.message : String(e),
    });
    return {
      kind: 'question-set',
      resume: {
        id: row.id,
        name: row.name?.trim() || `候选人 ${row.id}`,
        score: row.score,
        summary: truncateText(row.summary, 80, '暂无摘要'),
      },
      job: { id: job.id, title: job.title, dept: job.dept },
      overview: '我先按现有评分摘要和风险点整理了一组追问，适合面试时直接使用。',
      questions: fallbackQuestions({
        cons: row.cons,
        interview: row.interview,
        jobTitle: job.title,
      }),
    };
  }
}

export const suggestQuestions = tool({
  description:
    '为某一份已评分简历生成面试追问清单。需要用户给出明确简历 ID，例如 R-XXXX；适合“在对话中讨论这份简历 / 生成追问 / 面试问什么”。',
  inputSchema: z.object({
    resumeId: z.string().min(1).describe('简历业务 ID，例如 R-9821'),
  }),
  execute: async ({ resumeId }) => {
    try {
      return await suggestQuestionsForResume(resumeId);
    } catch (e) {
      return {
        kind: 'error' as const,
        message: e instanceof Error ? e.message : String(e),
      };
    }
  },
});
