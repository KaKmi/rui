import { NextResponse } from 'next/server';
import { withApiLog } from '@/lib/api-log';
import { log } from '@/lib/log';
import {
  scoreResumeRecord,
  type ScoredResumeResult,
  type ScoreResumeStep,
} from '@/lib/ai/tools/score-resume';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Ctx = { params: { taskId: string } };

type ScanMessage =
  | { type: 'start'; taskId: string; total: number }
  | { type: 'resume-start'; taskId: string; id: string; index: number; total: number }
  | { type: 'step'; taskId: string; id: string; step: ScoreResumeStep; label: string }
  | { type: 'resume-done'; taskId: string; result: ScoredResumeResult }
  | { type: 'resume-error'; taskId: string; id: string; error: string }
  | {
      type: 'done';
      taskId: string;
      total: number;
      ok: number;
      failed: number;
      results: ScoredResumeResult[];
    };

const STEP_LABEL: Record<ScoreResumeStep, string> = {
  load: '读取简历记录',
  redact: '脱敏简历正文',
  llm: '调用 MiMo 评分',
  save: '写回评分结果',
  done: '完成',
};

function parseResumeIds(req: Request): string[] {
  const url = new URL(req.url);
  const value = url.searchParams.get('resumeIds') ?? '';
  return value
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function encodeSSE(message: ScanMessage): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(message)}\n\n`);
}

export const GET = withApiLog<Ctx>(
  'GET /api/resumes/scan/[taskId]',
  async (req, { params }) => {
    const taskId = params.taskId;
    const resumeIds = parseResumeIds(req);
    if (resumeIds.length === 0) {
      return NextResponse.json({ error: 'resumeIds required' }, { status: 400 });
    }

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (message: ScanMessage) => controller.enqueue(encodeSSE(message));
        const results: ScoredResumeResult[] = [];
        let failed = 0;
        const t0 = Date.now();

        log.info('scan/start', { taskId, total: resumeIds.length });
        send({ type: 'start', taskId, total: resumeIds.length });

        for (let i = 0; i < resumeIds.length; i += 1) {
          const resumeId = resumeIds[i];
          if (!resumeId) continue;
          send({
            type: 'resume-start',
            taskId,
            id: resumeId,
            index: i + 1,
            total: resumeIds.length,
          });

          try {
            const result = await scoreResumeRecord(resumeId, {
              onStep: (step) => {
                send({ type: 'step', taskId, id: resumeId, step, label: STEP_LABEL[step] });
              },
            });
            results.push(result);
            send({ type: 'resume-done', taskId, result });
          } catch (e) {
            failed += 1;
            const error = e instanceof Error ? e.message : String(e);
            log.warn('scan/resume-error', { taskId, resumeId, error });
            send({ type: 'resume-error', taskId, id: resumeId, error });
          }
        }

        const done: ScanMessage = {
          type: 'done',
          taskId,
          total: resumeIds.length,
          ok: results.length,
          failed,
          results: results.sort((a, b) => b.score - a.score),
        };
        send(done);
        log.info('scan/done', {
          taskId,
          total: resumeIds.length,
          ok: results.length,
          failed,
          ms: Date.now() - t0,
        });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  },
);
