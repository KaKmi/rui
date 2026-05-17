import { tool } from 'ai';
import { z } from 'zod';

export const askSkills = tool({
  description:
    '询问技能/经验关键词（必备 或 加分项）。需要时机：你需要至少 3-5 个必备关键词；' +
    '加分项可选问可不问。已知则跳过。',
  inputSchema: z.object({
    question: z.string().describe('给用户的提问'),
    kind: z.enum(['must', 'nice']).describe('must=必备技能；nice=加分项'),
    presets: z
      .array(z.string())
      .default([])
      .describe('基于已知信息推荐的关键词；用户可全选/部分选/自己加'),
  }),
  outputSchema: z.object({
    values: z.array(z.string()).describe('用户最终的技能/经验关键词列表'),
  }),
});
