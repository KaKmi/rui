import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toJobDTO } from '@/lib/dto';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const row = await prisma.job.findUnique({ where: { id: params.id } });
  if (!row) {
    return NextResponse.json({ error: 'Job not found', id: params.id }, { status: 404 });
  }
  return NextResponse.json(toJobDTO(row));
}
