import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { mimoModel } from '@/lib/ai/mimo';
import { SYSTEM_PROMPT } from '@/lib/ai/prompts/system';
import { ruiTools } from '@/lib/ai/tools';

// 流式必须；Vercel 自动选 Node runtime（Prisma 依赖 ws + native）
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: UIMessage[] };

  const result = streamText({
    model: mimoModel,
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: ruiTools,
  });

  return result.toUIMessageStreamResponse();
}
