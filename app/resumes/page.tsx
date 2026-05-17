import { prisma } from '@/lib/db';
import { toJobDTO, toResumeDTO } from '@/lib/dto';
import { ResumesTable } from './ResumesTable.client';

export const dynamic = 'force-dynamic';

export default async function ResumesPage() {
  const [resumeRows, jobRows] = await Promise.all([
    prisma.resume.findMany({ orderBy: [{ score: 'desc' }, { createdAt: 'desc' }] }),
    prisma.job.findMany({ orderBy: { createdAt: 'desc' } }),
  ]);
  return <ResumesTable resumes={resumeRows.map(toResumeDTO)} jobs={jobRows.map(toJobDTO)} />;
}
