import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { toResumeDTO } from '@/lib/dto';
import { withApiLog } from '@/lib/api-log';
import { log } from '@/lib/log';

export const dynamic = 'force-dynamic';

const rejectBodySchema = z
  .object({ reason: z.string().trim().max(120).optional() })
  .partial()
  .default({});

/**
 * 标记候选人为不合适。
 *
 * spec §6.6.7 置灰保留 + 30 天归档（归档定时本里程碑只留 stub）。
 * 已邀面 / 已 offer 也允许触发：相当于撤销邀请；前端弹二次确认（M4 下一阶段做）。
 */
export const POST = withApiLog<{ params: { id: string } }>(
  'POST /api/resumes/[id]/reject',
  async (req, { params }) => {
    const row = await prisma.resume.findUnique({ where: { id: params.id } });
    if (!row) {
      return NextResponse.json({ error: 'Resume not found', id: params.id }, { status: 404 });
    }

    let reason: string | undefined;
    try {
      const json = (await req.json().catch(() => ({}))) as unknown;
      const parsed = rejectBodySchema.safeParse(json);
      if (parsed.success) reason = parsed.data.reason;
    } catch {
      // body 可为空
    }

    if (row.status === '已淘汰') {
      return NextResponse.json({ ok: true, resume: toResumeDTO(row), unchanged: true });
    }

    const updated = await prisma.resume.update({
      where: { id: params.id },
      data: {
        status: '已淘汰',
        rejectedAt: new Date(),
        rejectReason: reason ?? null,
        // 之前邀过又被标不合适，邀面时间戳保留作为审计痕迹，不清
      },
    });
    log.info('resume/reject', {
      resumeId: updated.id,
      jobId: updated.appliedForId,
      previousStatus: row.status,
      reason: reason ?? null,
    });
    return NextResponse.json({ ok: true, resume: toResumeDTO(updated) });
  },
);
