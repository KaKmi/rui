import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toJobDTO } from '@/lib/dto';
import { withApiLog } from '@/lib/api-log';

export const dynamic = 'force-dynamic';

export const GET = withApiLog<{ params: { id: string } }>(
  'GET /api/jobs/[id]',
  async (_req, { params }) => {
    const row = await prisma.job.findUnique({ where: { id: params.id } });
    if (!row) {
      return NextResponse.json({ error: 'Job not found', id: params.id }, { status: 404 });
    }
    return NextResponse.json(toJobDTO(row));
  },
);
