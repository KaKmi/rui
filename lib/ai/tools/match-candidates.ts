import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { toResumeDTO } from '@/lib/dto';

/**
 * 按岗位拉取候选人，按 AI 评分倒序返回 top K。
 * 真正的"匹配"逻辑（语义相似度等）M2.2 阶段先用现有评分代替；
 * M3.2 评分流落地后这里可以接 vector 检索或 LLM 重排。
 */
export const matchCandidates = tool({
  description:
    '对指定 JD，按 AI 评分倒序返回简历池里的 Top K 候选人。' +
    '需要时机：用户问"匹配/推荐/候选人"类问题。',
  inputSchema: z.object({
    jobId: z.string().describe('JD 业务编号，例：JD-2024-0118'),
    topK: z.number().int().min(1).max(20).default(5),
  }),
  execute: async ({ jobId, topK }) => {
    const [job, rows] = await Promise.all([
      prisma.job.findUnique({ where: { id: jobId } }),
      prisma.resume.findMany({
        where: { appliedForId: jobId },
        orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
        take: topK,
      }),
    ]);
    if (!job) {
      return { kind: 'error' as const, message: `找不到 JD ${jobId}` };
    }
    return {
      kind: 'match-list' as const,
      job: { id: job.id, title: job.title, dept: job.dept },
      candidates: rows.map(toResumeDTO).map((r) => ({
        id: r.id,
        name: r.name,
        score: r.score,
        yoe: r.yoe,
        current: r.current,
        expected: r.expected,
        summary: r.summary?.slice(0, 80) ?? '',
      })),
    };
  },
});
