import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toJobDTO } from '@/lib/dto';

// 命中 DB，需要每请求重新执行；禁止 Next 在 build 时预渲染。
export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = await prisma.job.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(rows.map(toJobDTO));
}
