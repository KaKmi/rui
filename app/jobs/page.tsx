import { SEED_JOBS } from '@/lib/mock-data';
import { JobsBoard } from './JobsBoard.client';

export default function JobsPage() {
  return <JobsBoard jobs={SEED_JOBS} />;
}
