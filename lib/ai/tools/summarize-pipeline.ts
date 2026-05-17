import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/db';

/**
 * 汇总当前招聘漏斗：所有招聘中职位的 简历池 / 面试 / Offer 计数 + 3 条洞察。
 * 洞察来自简单的统计阈值，不是 LLM 二次生成 —— 数字必须可解释。
 */
export const summarizePipeline = tool({
  description:
    '汇总当前招聘漏斗的总数 + 3 条洞察（利好 / 需关注 / 建议）。' +
    '需要时机：用户问"进展/回顾/漏斗/本周"。',
  inputSchema: z.object({
    scope: z
      .enum(['all', 'active'])
      .default('active')
      .describe('all=全部职位；active=仅在招中职位（默认）'),
  }),
  execute: async ({ scope }) => {
    const where = scope === 'active' ? { status: '招聘中' } : {};
    const jobs = await prisma.job.findMany({ where });

    const funnel = jobs.reduce(
      (acc, j) => ({
        resumes: acc.resumes + j.resumes,
        interviewed: acc.interviewed + j.interviewed,
        offer: acc.offer + j.offer,
      }),
      { resumes: 0, interviewed: 0, offer: 0 },
    );

    const insights: Array<{ tone: 'ok' | 'warn' | 'info'; text: string }> = [];

    // 利好：哪几个职位简历转面试率 > 25%
    const hot = jobs
      .filter((j) => j.resumes >= 5 && j.interviewed / j.resumes > 0.25)
      .map((j) => j.title);
    if (hot.length) {
      insights.push({
        tone: 'ok',
        text: `**${hot.join('、')}** 简历转面率 > 25%，可继续加投。`,
      });
    }

    // 需关注：哪几个职位简历 ≥ 15 但面试 = 0
    const cold = jobs
      .filter((j) => j.resumes >= 15 && j.interviewed === 0)
      .map((j) => j.title);
    if (cold.length) {
      insights.push({
        tone: 'warn',
        text: `**${cold.join('、')}** 简历积压无面试，建议复盘 JD 要求或转岗推荐。`,
      });
    }

    // 建议：总 offer 数与目标差距
    const totalHC = jobs.reduce((s, j) => s + j.headcount, 0);
    if (totalHC > 0) {
      insights.push({
        tone: 'info',
        text: `当前共 ${jobs.length} 个职位、HC ${totalHC}，已发 ${funnel.offer} 个 offer，进度 ${Math.round((funnel.offer / totalHC) * 100)}%。`,
      });
    }

    return {
      kind: 'pipeline-report' as const,
      scope,
      jobCount: jobs.length,
      funnel,
      insights,
      jobs: jobs.map((j) => ({
        id: j.id,
        title: j.title,
        resumes: j.resumes,
        interviewed: j.interviewed,
        offer: j.offer,
        status: j.status,
      })),
    };
  },
});
