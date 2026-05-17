import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toResumeDTO } from '@/lib/dto';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = await prisma.resume.findMany({
    orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
  });
  return NextResponse.json(rows.map(toResumeDTO));
}
