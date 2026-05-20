import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toResumeDTO } from '@/lib/dto';
import { withApiLog } from '@/lib/api-log';
import { log } from '@/lib/log';

export const dynamic = 'force-dynamic';

/**
 * 推进候选人到面试。
 *
 * spec §6.3 状态机：'AI 已评分' / '待评分' → '已邀面'。已 offer / 已淘汰 不允许回退。
 * v0.1 不真发企微，只更新 status + invitedAt + 写 audit log，前端拿 toast 反馈。
 */
export const POST = withApiLog<{ params: { id: string } }>(
  'POST /api/resumes/[id]/invite',
  async (_req, { params }) => {
    const row = await prisma.resume.findUnique({ where: { id: params.id } });
    if (!row) {
      return NextResponse.json({ error: 'Resume not found', id: params.id }, { status: 404 });
    }
    if (row.status === '已淘汰') {
      return NextResponse.json(
        { error: '该候选人已被标记为不合适，不能直接邀面，请先恢复' },
        { status: 409 },
      );
    }
    if (row.status === '已邀面') {
      // 幂等：重复点不报错，直接返当前态
      return NextResponse.json({ ok: true, resume: toResumeDTO(row), unchanged: true });
    }

    const updated = await prisma.resume.update({
      where: { id: params.id },
      data: {
        status: '已邀面',
        invitedAt: new Date(),
        // 邀面后清掉先前的拒绝标记，覆盖一次重新启用
        rejectedAt: null,
        rejectReason: null,
      },
    });
    log.info('resume/invite', {
      resumeId: updated.id,
      jobId: updated.appliedForId,
      previousStatus: row.status,
    });
    return NextResponse.json({ ok: true, resume: toResumeDTO(updated) });
  },
);
