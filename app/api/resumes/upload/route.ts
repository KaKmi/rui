import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withApiLog } from '@/lib/api-log';
import { log } from '@/lib/log';
import {
  parseResume,
  isAcceptedMime,
  isAcceptedByName,
} from '@/lib/parsers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // OCR 单页中文识别 3-8s，10 页 + 多文件串行可能逼近 60s 上限

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB，对齐 Vercel Hobby body 4.5MB + 余量
const MAX_FILES_PER_REQUEST = 10;

const querySchema = z.object({
  jobId: z.string().min(1, 'jobId required'),
});

type UploadItem = {
  id: string;
  fileName: string;
  size: number;
  status: '待评分' | '解析失败';
  blobUrl?: string;
  error?: string;
};

type UploadStage = 'queued' | 'parsing' | 'ocr' | 'uploading' | 'saving' | 'done' | 'failed';

type UploadEvent =
  | { type: 'start'; jobId: string; total: number; fileNames: string[] }
  | { type: 'file-stage'; index: number; name: string; stage: UploadStage }
  | { type: 'file-done'; index: number; item: UploadItem }
  | {
      type: 'done';
      jobId: string;
      taskId: string;
      items: UploadItem[];
      summary: { total: number; ok: number; failed: number };
    };

/**
 * 生成 R-{base36 时间戳后 6 位 + 4 位随机} 业务 ID。
 * 跟 mock data 的 R-9821 形态对齐；并发碰撞概率 ~1/2^36，简历池不会撞。
 */
function newResumeId(): string {
  const t = Date.now().toString(36).slice(-6).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `R-${t}${r}`;
}

function newTaskId(): string {
  const t = Date.now().toString(36).slice(-7).toUpperCase();
  const r = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SCAN-${t}${r}`;
}

function formatAppliedAt(d: Date): string {
  // 简洁中文："今天 HH:mm" / "昨天 HH:mm" / "MM-DD HH:mm"
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (sameDay) return `今天 ${hh}:${mm}`;
  if (isYesterday) return `昨天 ${hh}:${mm}`;
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${hh}:${mm}`;
}

function isUploadFile(value: FormDataEntryValue): value is File {
  return (
    typeof value === 'object' &&
    value !== null &&
    'arrayBuffer' in value &&
    'name' in value &&
    'size' in value
  );
}

export const POST = withApiLog('POST /api/resumes/upload', async (req) => {
  // 1) 校验 jobId 在 query
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({ jobId: url.searchParams.get('jobId') });
  if (!parsed.success) {
    return NextResponse.json(
      { error: '缺少或非法的 jobId', detail: parsed.error.message },
      { status: 400 },
    );
  }
  const { jobId } = parsed.data;

  // 2) 确认 Job 存在
  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { id: true } });
  if (!job) {
    return NextResponse.json({ error: `Job not found: ${jobId}` }, { status: 404 });
  }

  // 3) 解析 multipart
  let form: FormData;
  try {
    form = await req.formData();
  } catch (e) {
    return NextResponse.json(
      { error: '请求体不是合法的 multipart/form-data', detail: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }

  const files = form.getAll('files').filter(isUploadFile);
  if (files.length === 0) {
    return NextResponse.json({ error: '没有上传文件（字段名应为 "files"）' }, { status: 400 });
  }
  if (files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json(
      { error: `单次最多上传 ${MAX_FILES_PER_REQUEST} 份` },
      { status: 400 },
    );
  }

  log.info('upload/start', {
    jobId,
    fileCount: files.length,
    fileNames: files.map((f) => f.name),
  });

  // 4) 串行处理 + NDJSON 流式推回，让前端逐文件看到 parsing → ocr → uploading → saving → done
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (ev: UploadEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(ev)}\n`));
      };
      send({
        type: 'start',
        jobId,
        total: files.length,
        fileNames: files.map((f) => f.name),
      });

      const items: UploadItem[] = [];
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i]!;
        const index = i + 1;
        log.info('upload/file-begin', { index, total: files.length, name: file.name });
        const t0 = Date.now();
        const onStage = (stage: UploadStage) =>
          send({ type: 'file-stage', index, name: file.name, stage });
        onStage('queued');

        let item: UploadItem;
        try {
          item = await handleFile(file, jobId, onStage);
        } catch (e) {
          const err = e instanceof Error ? e.message : String(e);
          log.error('upload/file-crash', { index, name: file.name, err });
          item = {
            id: '',
            fileName: file.name,
            size: file.size,
            status: '解析失败',
            error: `内部错误：${err}`,
          };
        }
        items.push(item);
        onStage(item.status === '待评分' ? 'done' : 'failed');
        send({ type: 'file-done', index, item });
        log.info('upload/file-end', { index, name: file.name, ms: Date.now() - t0 });
      }

      const ok = items.filter((i) => i.status === '待评分').length;
      const failed = items.length - ok;
      log.info('upload/done', { jobId, total: items.length, ok, failed });
      send({
        type: 'done',
        jobId,
        taskId: newTaskId(),
        items,
        summary: { total: items.length, ok, failed },
      });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
});

async function handleFile(
  file: File,
  jobId: string,
  onStage: (stage: UploadStage) => void,
): Promise<UploadItem> {
  const fileName = file.name;
  const size = file.size;
  const mime = file.type || null;
  const resumeId = newResumeId();

  // 大小校验
  if (size > MAX_FILE_SIZE) {
    log.warn('upload/oversize', { resumeId, fileName, size });
    return {
      id: '',
      fileName,
      size,
      status: '解析失败',
      error: `文件超过 ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`,
    };
  }

  // 类型校验
  if (!isAcceptedMime(mime) && !isAcceptedByName(fileName)) {
    log.warn('upload/bad-mime', { resumeId, fileName, mime });
    return {
      id: '',
      fileName,
      size,
      status: '解析失败',
      error: `仅支持 .pdf / .docx，当前 ${mime ?? '未知 MIME'}`,
    };
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 先解析文本。解析失败不入库，也不上传 Blob，避免产生不可评分的 Resume 记录。
  // parseResume 内部进 PDF 时会先 emit 'parsing'；走 OCR 时会 emit 'ocr'。
  const parsed = await parseResume(buffer, mime, fileName, (s) => {
    onStage(s === 'ocr' ? 'ocr' : 'parsing');
  });
  if (!parsed.ok) {
    log.warn('upload/parse-fail', { resumeId, fileName, err: parsed.error });
    return { id: '', fileName, size, status: '解析失败', error: parsed.error };
  }

  log.info('upload/parsed', {
    resumeId,
    fileName,
    pages: parsed.pageCount,
    textLen: parsed.text.length,
    quality: parsed.quality,
    ocrUsed: parsed.ocrUsed === true,
  });

  // 上传到 Blob：resumes/{jobId}/{resumeId}-{filename}
  onStage('uploading');
  let blobUrl: string;
  try {
    // 简历含 PII，用 private 访问：put 返回的 URL 是内部标识，
    // 真实下载链接由 @vercel/blob 的 get() 配 access:'private' 时签发。
    const blob = await put(`resumes/${jobId}/${resumeId}-${fileName}`, buffer, {
      access: 'private',
      contentType: mime ?? undefined,
    });
    blobUrl = blob.url;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error('upload/blob-fail', { resumeId, fileName, err: msg });
    return { id: '', fileName, size, status: '解析失败', error: `上传到 Blob 失败：${msg}` };
  }

  onStage('saving');
  await prisma.resume.create({
    data: {
      id: resumeId,
      status: '待评分',
      appliedForId: jobId,
      appliedAt: formatAppliedAt(new Date()),
      originalFileUrl: blobUrl,
      originalFileName: fileName,
      originalFileSize: size,
      originalMimeType: mime,
      parsedText: parsed.text,
      parseError: null,
    },
  });

  return {
    id: resumeId,
    fileName,
    size,
    status: '待评分',
    blobUrl,
  };
}

