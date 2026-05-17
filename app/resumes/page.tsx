import { SEED_JOBS, SEED_RESUMES } from '@/lib/mock-data';
import { ResumesTable } from './ResumesTable.client';

export default function ResumesPage() {
  return <ResumesTable resumes={SEED_RESUMES} jobs={SEED_JOBS} />;
}
