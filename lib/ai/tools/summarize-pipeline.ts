import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/db';

/**
 * 汇总当前招聘漏斗。
 *
 * 注意：Job.resumes / Job.interviewed / Job.offer 是 seed 阶段的冗余展示字段，
 * 上传简历、邀面、offer 状态变化不会自动维护它们。这里必须以 Resume 表实时聚合为准。
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
    const jobs = await prisma.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        headcount: true,
        status: true,
      },
    });

    const jobIds = jobs.map((j) => j.id);

    const grouped = jobIds.length
      ? await prisma.resume.groupBy({
          by: ['appliedForId', 'status'],
          where: { appliedForId: { in: jobIds } },
          _count: { _all: true },
        })
      : [];

    type Funnel = { resumes: number; interviewed: number; offer: number };
    const byJob = new Map<string, Funnel>();
    for (const id of jobIds) byJob.set(id, { resumes: 0, interviewed: 0, offer: 0 });
    let parseFailed = 0;

    for (const row of grouped) {
      const current = byJob.get(row.appliedForId);
      if (!current) continue;

      const count = row._count._all;
      if (row.status === '解析失败') {
        parseFailed += count;
        continue;
      }

      current.resumes += count;

      // Offer 候选人已经走过面试阶段，漏斗里同时计入 interviewed 与 offer。
      if (row.status === '已邀面' || row.status === '已 offer') {
        current.interviewed += count;
      }
      if (row.status === '已 offer') {
        current.offer += count;
      }
    }

    const jobRows = jobs.map((j) => ({
      id: j.id,
      title: j.title,
      headcount: j.headcount,
      status: j.status,
      ...(byJob.get(j.id) ?? { resumes: 0, interviewed: 0, offer: 0 }),
    }));

    const funnel = jobRows.reduce(
      (acc, j) => ({
        resumes: acc.resumes + j.resumes,
        interviewed: acc.interviewed + j.interviewed,
        offer: acc.offer + j.offer,
      }),
      { resumes: 0, interviewed: 0, offer: 0 },
    );

    const insights: Array<{ tone: 'ok' | 'warn' | 'info'; text: string }> = [];

    const hot = jobRows
      .filter((j) => j.resumes >= 5 && j.interviewed / j.resumes > 0.25)
      .map((j) => j.title);
    if (hot.length) {
      insights.push({
        tone: 'ok',
        text: `**${hot.join('、')}** 简历转面率 > 25%，可继续加投。`,
      });
    }

    const cold = jobRows
      .filter((j) => j.resumes >= 10 && j.interviewed === 0)
      .map((j) => j.title);
    if (cold.length) {
      insights.push({
        tone: 'warn',
        text: `**${cold.join('、')}** 简历已有积累但暂无面试，建议复盘 JD 要求或优先筛选高分候选人。`,
      });
    }

    if (parseFailed > 0) {
      insights.push({
        tone: 'warn',
        text: `有 ${parseFailed} 份简历解析失败，未计入漏斗；建议重新上传清晰 PDF/DOCX。`,
      });
    }

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
      jobs: jobRows,
    };
  },
});
