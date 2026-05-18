import { prisma } from '@/lib/db';
import { toJobDTO } from '@/lib/dto';
import { ChatStream } from './ChatStream.client';

// ChatStream 里 ResumeUpload widget 需要 jobs 列表选择关联职位 —— SC 这里拉一次塞 props
export const dynamic = 'force-dynamic';

export default async function ChatPage() {
  const rows = await prisma.job.findMany({
    where: { status: '招聘中' },
    orderBy: { createdAt: 'desc' },
  });
  const jobs = rows.map(toJobDTO);
  return <ChatStream jobs={jobs} />;
}
