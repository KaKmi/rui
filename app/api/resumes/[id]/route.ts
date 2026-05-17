import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toResumeDTO } from '@/lib/dto';
import { withApiLog } from '@/lib/api-log';

export const dynamic = 'force-dynamic';

export const GET = withApiLog<{ params: { id: string } }>(
  'GET /api/resumes/[id]',
  async (_req, { params }) => {
    const row = await prisma.resume.findUnique({ where: { id: params.id } });
    if (!row) {
      return NextResponse.json({ error: 'Resume not found', id: params.id }, { status: 404 });
    }
    return NextResponse.json(toResumeDTO(row));
  },
);
