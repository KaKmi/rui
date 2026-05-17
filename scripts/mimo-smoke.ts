import 'dotenv/config';
import { streamText, tool, stepCountIs } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const baseURL = process.env.MIMO_BASE_URL;
const apiKey = process.env.MIMO_API_KEY;
const modelId = process.env.MIMO_MODEL ?? 'mimo-v2.5-pro';

if (!baseURL || !apiKey) {
  console.error('✗ MIMO_BASE_URL or MIMO_API_KEY missing');
  process.exit(1);
}

/**
 * MiMo 默认开 thinking mode 且要求 reasoning_content 回传，
 * `@ai-sdk/anthropic` 默认不带 thinking 字段也不回填 reasoning。
 * 用 fetch 拦截器在 body 里强制塞 `thinking: {type: 'disabled'}` 关掉思考链。
 */
const fetchWithThinkingDisabled: typeof fetch = async (input, init) => {
  if (init?.body && typeof init.body === 'string') {
    try {
      const body = JSON.parse(init.body);
      body.thinking = { type: 'disabled' };
      init = { ...init, body: JSON.stringify(body) };
    } catch {
      // 不是 JSON，原样放行
    }
  }
  return fetch(input as URL, init);
};

const mimo = createAnthropic({ baseURL, apiKey, fetch: fetchWithThinkingDisabled });
const model = mimo(modelId);

async function streamingProbe() {
  console.log('\n--- [1/2] Streaming probe ---');
  const t0 = Date.now();
  let firstChunkAt = 0;
  let chunkCount = 0;
  const result = streamText({
    model,
    prompt: '用一句话介绍你自己，不超过 30 字。',
  });
  for await (const chunk of result.textStream) {
    if (!firstChunkAt) firstChunkAt = Date.now();
    chunkCount += 1;
    process.stdout.write(chunk);
  }
  const finishReason = await result.finishReason;
  console.log(
    `\n✓ stream OK · ttf=${firstChunkAt - t0}ms · ${chunkCount} chunks · total=${Date.now() - t0}ms · finish=${finishReason}`,
  );
}

async function toolCallProbe() {
  console.log('\n--- [2/2] Tool calling probe (score_resume schema) ---');
  const scoreResume = tool({
    description: '对一份候选人简历做综合评分，输出 5 维 + 摘要。',
    inputSchema: z.object({
      candidate: z.string().describe('候选人摘要'),
    }),
    execute: async ({ candidate }) => {
      // 假执行：把传进来的输入回弹（确保模型生成的入参解析正确）
      return {
        ok: true,
        receivedCandidate: candidate.slice(0, 80),
      };
    },
  });

  const t0 = Date.now();
  let toolCallSeen = false;
  let toolResultSeen = false;
  const result = streamText({
    model,
    tools: { score_resume: scoreResume },
    stopWhen: stepCountIs(3),
    prompt:
      '调用 score_resume 工具，对这位候选人评分：「张文轩，男 30，浙大硕士，字节高级前端 4 年，开源 React 状态库 4k+ star」。',
  });

  for await (const part of result.fullStream) {
    if (part.type === 'tool-call') {
      toolCallSeen = true;
      console.log(`  tool-call: ${part.toolName} ← ${JSON.stringify(part.input).slice(0, 100)}`);
    } else if (part.type === 'tool-result') {
      toolResultSeen = true;
      console.log(`  tool-result: ${JSON.stringify(part.output).slice(0, 100)}`);
    } else if (part.type === 'error') {
      console.error(`  ✗ stream error:`, part.error);
    }
  }
  const finishReason = await result.finishReason;
  console.log(
    `${toolCallSeen && toolResultSeen ? '✓' : '⚠'} tool round-trip · finish=${finishReason} · call=${toolCallSeen} · result=${toolResultSeen} · total=${Date.now() - t0}ms`,
  );
}

async function main() {
  console.log(`endpoint: ${baseURL}`);
  console.log(`model:    ${modelId}`);
  await streamingProbe();
  await toolCallProbe();
}

main().catch((e: unknown) => {
  console.error('\n✗ probe failed:');
  console.error('  ', e instanceof Error ? e.stack ?? e.message : String(e));
  process.exit(1);
});
