import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  jobFindUnique: vi.fn(),
  resumeCreate: vi.fn(),
  parseResume: vi.fn(),
  isAcceptedMime: vi.fn(),
  isAcceptedByName: vi.fn(),
  put: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    job: { findUnique: mocks.jobFindUnique },
    resume: { create: mocks.resumeCreate },
  },
}));

vi.mock('@/lib/parsers', () => ({
  parseResume: mocks.parseResume,
  isAcceptedMime: mocks.isAcceptedMime,
  isAcceptedByName: mocks.isAcceptedByName,
}));

vi.mock('@vercel/blob', () => ({
  put: mocks.put,
}));

vi.mock('@/lib/api-log', () => ({
  withApiLog: (_name: string, handler: (req: Request) => Promise<Response>) => handler,
}));

vi.mock('@/lib/log', () => ({
  log: {
    info: mocks.logInfo,
    warn: mocks.logWarn,
    error: mocks.logError,
  },
}));

import { POST } from '@/app/api/resumes/upload/route';

function uploadRequest(fileOrFiles: File | File[]): Request {
  const form = new FormData();
  const files = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
  for (const file of files) form.append('files', file);
  return {
    url: 'http://localhost/api/resumes/upload?jobId=J-1',
    method: 'POST',
    formData: vi.fn().mockResolvedValue(form),
  } as unknown as Request;
}

describe('POST /api/resumes/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.jobFindUnique.mockResolvedValue({ id: 'J-1' });
    mocks.isAcceptedMime.mockReturnValue(true);
    mocks.isAcceptedByName.mockReturnValue(true);
  });

  it('does not upload or create a resume record when parsing fails', async () => {
    mocks.parseResume.mockResolvedValue({ ok: false, error: 'PDF 文本质量过低' });

    const res = await POST(uploadRequest(new File(['bad pdf'], 'bad.pdf', { type: 'application/pdf' })), undefined);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      id: '',
      fileName: 'bad.pdf',
      status: '解析失败',
      error: 'PDF 文本质量过低',
    });
    expect(mocks.put).not.toHaveBeenCalled();
    expect(mocks.resumeCreate).not.toHaveBeenCalled();
  });

  it('creates a pending resume record after parsing and blob upload succeed', async () => {
    mocks.parseResume.mockResolvedValue({
      ok: true,
      text: '候选人有 5 年 TypeScript 和 React 经验。',
      pageCount: 1,
      quality: { flags: [] },
    });
    mocks.put.mockResolvedValue({ url: 'https://blob.example/resume.pdf' });

    const res = await POST(uploadRequest(new File(['good pdf'], 'good.pdf', { type: 'application/pdf' })), undefined);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items[0]).toMatchObject({
      fileName: 'good.pdf',
      status: '待评分',
      blobUrl: 'https://blob.example/resume.pdf',
    });
    expect(body.items[0].id).toMatch(/^R-/);
    expect(mocks.put).toHaveBeenCalledOnce();
    expect(mocks.resumeCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: body.items[0].id,
        status: '待评分',
        appliedForId: 'J-1',
        originalFileUrl: 'https://blob.example/resume.pdf',
        originalFileName: 'good.pdf',
        parsedText: '候选人有 5 年 TypeScript 和 React 经验。',
        parseError: null,
      }),
    });
  });

  it('keeps one result per uploaded file even when filenames repeat', async () => {
    mocks.parseResume.mockResolvedValue({
      ok: true,
      text: '候选人有 React 经验。',
      pageCount: 1,
      quality: { flags: [] },
    });
    mocks.put
      .mockResolvedValueOnce({ url: 'https://blob.example/resume-1.pdf' })
      .mockResolvedValueOnce({ url: 'https://blob.example/resume-2.pdf' });

    const res = await POST(
      uploadRequest([
        new File(['first pdf'], 'same.pdf', { type: 'application/pdf' }),
        new File(['second pdf'], 'same.pdf', { type: 'application/pdf' }),
      ]),
      undefined,
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items).toHaveLength(2);
    expect(body.items[0]).toMatchObject({
      fileName: 'same.pdf',
      status: '待评分',
      blobUrl: 'https://blob.example/resume-1.pdf',
    });
    expect(body.items[1]).toMatchObject({
      fileName: 'same.pdf',
      status: '待评分',
      blobUrl: 'https://blob.example/resume-2.pdf',
    });
    expect(body.items[0].id).toMatch(/^R-/);
    expect(body.items[1].id).toMatch(/^R-/);
    expect(body.items[0].id).not.toBe(body.items[1].id);
    expect(mocks.put).toHaveBeenCalledTimes(2);
    expect(mocks.resumeCreate).toHaveBeenCalledTimes(2);
  });
});
