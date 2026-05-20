import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { toJobDTO } from '@/lib/dto';
import { withApiLog } from '@/lib/api-log';
import { log } from '@/lib/log';
import type { JobStatus } from '@/types';

export const dynamic = 'force-dynamic';

export const GET = withApiLog<{ params: { id: string } }>(
  'GET /api/jobs/[id]',
  async (_req, { params }) => {
    const row = await prisma.job.findUnique({ where: { id: params.id } });
    if (!row) {
      return NextResponse.json({ error: 'Job not found', id: params.id }, { status: 404 });
    }
    return NextResponse.json(toJobDTO(row));
  },
);

const JOB_STATUSES = ['草稿', '招聘中', '已暂停', '已关闭'] as const;

/**
 * spec §6.3 职位状态机：
 *
 *   草稿 ──发布──▶ 招聘中 ──暂停──▶ 已暂停
 *                    │                │
 *                    └──关闭──┐  ┌──恢复──┘
 *                             ▼  ▼
 *                            已关闭（终态）
 */
const STATUS_TRANSITIONS: Record<JobStatus, readonly JobStatus[]> = {
  草稿: ['招聘中', '已关闭'],
  招聘中: ['已暂停', '已关闭'],
  已暂停: ['招聘中', '已关闭'],
  已关闭: [], // 终态
};

const patchBodySchema = z.object({
  status: z.enum(JOB_STATUSES).optional(),
});

export const PATCH = withApiLog<{ params: { id: string } }>(
  'PATCH /api/jobs/[id]',
  async (req, { params }) => {
    const row = await prisma.job.findUnique({ where: { id: params.id } });
    if (!row) {
      return NextResponse.json({ error: 'Job not found', id: params.id }, { status: 404 });
    }

    let body: z.infer<typeof patchBodySchema>;
    try {
      const json = (await req.json()) as unknown;
      const parsed = patchBodySchema.safeParse(json);
      if (!parsed.success) {
        return NextResponse.json(
          { error: '请求体校验失败', detail: parsed.error.message },
          { status: 400 },
        );
      }
      body = parsed.data;
    } catch (e) {
      return NextResponse.json(
        { error: '请求体不是合法的 JSON', detail: e instanceof Error ? e.message : String(e) },
        { status: 400 },
      );
    }

    if (!body.status) {
      return NextResponse.json(
        { error: '没有可应用的变更（目前仅支持 status）' },
        { status: 400 },
      );
    }

    const currentStatus = row.status as JobStatus;
    if (currentStatus === body.status) {
      return NextResponse.json({ ok: true, job: toJobDTO(row), unchanged: true });
    }

    const allowed = STATUS_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(body.status)) {
      return NextResponse.json(
        { error: `不允许的状态迁移：${currentStatus} → ${body.status}`, allowed },
        { status: 409 },
      );
    }

    const updated = await prisma.job.update({
      where: { id: params.id },
      data: { status: body.status },
    });
    log.info('job/status-change', {
      jobId: updated.id,
      from: currentStatus,
      to: body.status,
    });
    return NextResponse.json({ ok: true, job: toJobDTO(updated) });
  },
);
