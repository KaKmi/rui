import { tool } from 'ai';
import { z } from 'zod';

export const askLevel = tool({
  description:
    '询问职级。需要时机：你不知道用户想招 P 几（或同等级别）。已知则跳过。',
  inputSchema: z.object({
    question: z.string().describe('给用户的提问，例：「这个岗位想招 P 几？」'),
    presets: z
      .array(z.string())
      .default(['P5', 'P6', 'P7', 'P8'])
      .describe('职级快捷选项，可以是 "P6 / P7" 这种区间'),
  }),
  outputSchema: z.object({
    value: z.string().describe('用户选/填的职级，例："P7" 或 "P6 / P7"'),
  }),
});
