import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withApiLog } from '@/lib/api-log';
import { log } from '@/lib/log';
import { scoreResumeRecord } from '@/lib/ai/tools/score-resume';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * 对已上传的简历单独跑一次评分，覆盖之前的结果。
 * 适用：
 *  - 评分阶段 schema 失败（status 还停在"待评分"）
 *  - 改了 JD 后想用新 JD 重新评一遍
 *  - 之前 AI 已评分，想刷一次新结果
 *
 * 解析失败、parsedText 为空的不允许走这里（先重传 PDF）。
 */
export const POST = withApiLog<{ params: { id: string } }>(
  'POST /api/resumes/[id]/rescore',
  async (_req, { params }) => {
    const row = await prisma.resume.findUnique({
      where: { id: params.id },
      select: { id: true, status: true, parsedText: true, appliedForId: true },
    });
    if (!row) {
      return NextResponse.json({ error: 'Resume not found', id: params.id }, { status: 404 });
    }
    if (!row.parsedText?.trim()) {
      return NextResponse.json(
        { error: '简历正文为空，无法重新评分。请重新上传 PDF / DOCX。' },
        { status: 409 },
      );
    }

    const t0 = Date.now();
    try {
      const result = await scoreResumeRecord(params.id);
      log.info('resume/rescore', {
        resumeId: params.id,
        jobId: row.appliedForId,
        previousStatus: row.status,
        score: result.score,
        ms: Date.now() - t0,
      });
      return NextResponse.json({ ok: true, result });
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      log.warn('resume/rescore-fail', {
        resumeId: params.id,
        ms: Date.now() - t0,
        err,
      });
      return NextResponse.json({ error: `重新评分失败：${err}` }, { status: 500 });
    }
  },
);
