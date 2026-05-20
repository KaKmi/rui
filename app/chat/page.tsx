import { prisma } from '@/lib/db';
import { toJobDTO } from '@/lib/dto';
import { ChatStream } from './ChatStream.client';

// ChatStream 里 ResumeUpload / 匹配排序职位选择需要职位列表 —— SC 这里拉最近录入的 10 个塞 props
export const dynamic = 'force-dynamic';

export default async function ChatPage({
  searchParams,
}: {
  searchParams?: { resumeId?: string; intent?: string };
}) {
  const rows = await prisma.job.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  const jobs = rows.map(toJobDTO);
  const resumeId = searchParams?.resumeId?.trim();
  const initialPrompt =
    resumeId && searchParams?.intent === 'suggest_questions'
      ? `请调用 suggest_questions 工具，围绕简历 ${resumeId} 和它对应的岗位生成面试追问清单。不要重新评分，结果放到右侧画布。`
      : undefined;
  return <ChatStream jobs={jobs} initialPrompt={initialPrompt} />;
}
