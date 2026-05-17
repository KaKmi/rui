import { prisma } from '@/lib/db';
import { toJobDTO } from '@/lib/dto';
import { JobsBoard } from './JobsBoard.client';

// 命中 DB，避免被静态预渲染
export const dynamic = 'force-dynamic';

export default async function JobsPage() {
  const rows = await prisma.job.findMany({ orderBy: { createdAt: 'desc' } });
  const jobs = rows.map(toJobDTO);
  return <JobsBoard jobs={jobs} />;
}
