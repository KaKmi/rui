import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withApiLog } from '@/lib/api-log';
import { log } from '@/lib/log';

export const dynamic = 'force-dynamic';

const saveJDBodySchema = z.object({
  meta: z.object({
    title: z.string().trim().min(2).max(40),
    dept: z.string().trim().min(1).max(60),
    level: z.string().trim().min(1).max(40),
    location: z.string().trim().min(1).max(60),
    salary: z.string().trim().min(1).max(40),
    headcount: z.number().int().min(1).max(99),
    skills: z.array(z.string().trim().min(1).max(24)).max(12),
  }),
  markdown: z.string().min(1).max(8000),
});

type SaveJDBody = z.infer<typeof saveJDBodySchema>;

/**
 * 把对话生成的 JD 落库为 Job（status='草稿'）。
 *
 * - 业务 ID 形如 JD-{year}-{4 digit running}，按当年现有 jobs 数 + 1。
 * - markdown 拆四段塞进 description / responsibilities / requirements / nice。
 *   段标题对应 generate-jd.ts 里"## 岗位介绍 / ## 工作职责 / ## 任职要求 / ## 加分项"。
 */
async function generateNextJobId(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `JD-${year}-`;
  // 取本年最大编号 +1。Postgres 字符串排序对 4 位定宽编号是 OK 的。
  const last = await prisma.job.findFirst({
    where: { id: { startsWith: prefix } },
    orderBy: { id: 'desc' },
    select: { id: true },
  });
  const nextSeq = last ? Number.parseInt(last.id.slice(prefix.length), 10) + 1 : 1;
  if (!Number.isFinite(nextSeq)) {
    throw new Error(`无法解析现有 JD 编号：${last?.id}`);
  }
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

type Section = 'intro' | 'responsibilities' | 'requirements' | 'nice';

function splitMarkdownSections(md: string): {
  description: string;
  responsibilities: string[];
  requirements: string[];
  nice: string[];
} {
  const lines = md.split(/\r?\n/);
  const bucket: Record<Section, string[]> = {
    intro: [],
    responsibilities: [],
    requirements: [],
    nice: [],
  };
  let current: Section | null = null;
  for (const line of lines) {
    const heading = line.trim();
    if (heading.startsWith('## ')) {
      const t = heading.slice(3).trim();
      if (t.includes('岗位介绍') || t.includes('岗位描述')) current = 'intro';
      else if (t.includes('工作职责') || t.includes('职责')) current = 'responsibilities';
      else if (t.includes('任职要求') || t.includes('要求')) current = 'requirements';
      else if (t.includes('加分')) current = 'nice';
      else current = null;
      continue;
    }
    if (current) bucket[current].push(line);
  }

  const toBullets = (lines: string[]): string[] =>
    lines
      .map((l) => l.trim())
      .filter(Boolean)
      .filter((l) => l.startsWith('-') || l.startsWith('*') || /^\d+[.、)]/.test(l))
      .map((l) => l.replace(/^[-*]\s*|^\d+[.、)]\s*/, '').trim())
      .filter(Boolean);

  return {
    description: bucket.intro.map((l) => l.trim()).filter(Boolean).join('\n').slice(0, 600),
    responsibilities: toBullets(bucket.responsibilities).slice(0, 8),
    requirements: toBullets(bucket.requirements).slice(0, 8),
    nice: toBullets(bucket.nice).slice(0, 6),
  };
}

export const POST = withApiLog('POST /api/chat/save-jd', async (req) => {
  let body: SaveJDBody;
  try {
    const json = (await req.json()) as unknown;
    const parsed = saveJDBodySchema.safeParse(json);
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

  const jobId = await generateNextJobId();
  const { description, responsibilities, requirements, nice } = splitMarkdownSections(
    body.markdown,
  );

  const job = await prisma.job.create({
    data: {
      id: jobId,
      title: body.meta.title,
      dept: body.meta.dept,
      level: body.meta.level,
      location: body.meta.location,
      salary: body.meta.salary,
      headcount: body.meta.headcount,
      skills: body.meta.skills,
      type: '全职',
      status: '草稿',
      owner: '',
      hr: '',
      description,
      responsibilities,
      requirements,
      nice,
    },
  });

  log.info('chat/save-jd', {
    jobId: job.id,
    title: job.title,
    sections: {
      description: description.length,
      responsibilities: responsibilities.length,
      requirements: requirements.length,
      nice: nice.length,
    },
  });

  return NextResponse.json({ ok: true, jobId: job.id, status: job.status });
});
