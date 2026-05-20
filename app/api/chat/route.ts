import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { mimoModel } from '@/lib/ai/mimo';
import { inferForcedToolRoute } from '@/lib/ai/chat-routing';
import { SYSTEM_PROMPT } from '@/lib/ai/prompts/system';
import { ruiTools } from '@/lib/ai/tools';
import { withApiLog } from '@/lib/api-log';
import { log } from '@/lib/log';

// 流式必须；Vercel 自动选 Node runtime（Prisma 依赖 ws + native）
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const POST = withApiLog('POST /api/chat', async (req) => {
  const { messages } = (await req.json()) as { messages: UIMessage[] };
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const lastUserText = lastUser?.parts.find((p) => 'type' in p && p.type === 'text');
  const userPreview =
    lastUserText && 'text' in lastUserText ? (lastUserText as { text: string }).text : '';
  log.info('chat/start', {
    msgCount: messages.length,
    userPreview: userPreview.slice(0, 100),
  });

  const forceRoute = messages[messages.length - 1]?.role === 'user'
    ? inferForcedToolRoute(userPreview)
    : null;
  if (forceRoute) {
    log.info('chat/tool-route', {
      toolName: forceRoute.toolName,
      reason: forceRoute.reason,
    });
  }

  const t0 = Date.now();
  const result = streamText({
    model: mimoModel,
    system: forceRoute
      ? `${SYSTEM_PROMPT}\n\n## 本轮强制工具路由\n${forceRoute.instruction}`
      : SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: ruiTools,
    toolChoice: forceRoute ? { type: 'tool', toolName: forceRoute.toolName } : undefined,
    onError: ({ error }) => {
      log.error('chat/stream-error', {
        err: error instanceof Error ? error.message : String(error),
        ms: Date.now() - t0,
      });
    },
    onFinish: (event) => {
      const toolCalls = event.steps.flatMap((s) =>
        s.toolCalls.map((c) => ({
          name: c.toolName,
          input: c.input,
        })),
      );
      log.info('chat/finish', {
        ms: Date.now() - t0,
        finishReason: event.finishReason,
        tokens: event.totalUsage,
        steps: event.steps.length,
        toolCalls,
        textLen: event.text.length,
        // 完整模型最终回复（流结束后合并）—— 长度大时 prod 可以接 ELK 截断
        text: event.text,
      });
    },
  });

  return result.toUIMessageStreamResponse();
});
