import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toResumeDTO } from '@/lib/dto';
import { withApiLog } from '@/lib/api-log';

export const dynamic = 'force-dynamic';

export const GET = withApiLog('GET /api/resumes', async () => {
  const rows = await prisma.resume.findMany({
    orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
  });
  return NextResponse.json(rows.map(toResumeDTO));
});
