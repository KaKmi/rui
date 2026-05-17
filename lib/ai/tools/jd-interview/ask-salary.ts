import { tool } from 'ai';
import { z } from 'zod';

export const askSalary = tool({
  description:
    '询问薪资范围。需要时机：你不知道月薪上下限或年薪倍数。已知则跳过。',
  inputSchema: z.object({
    question: z.string().describe('给用户的提问'),
  }),
  outputSchema: z.object({
    min: z.number().int().positive().describe('月薪下限，单位 K，例：30'),
    max: z.number().int().positive().describe('月薪上限，单位 K，例：55'),
    monthsPerYear: z
      .number()
      .min(12)
      .max(20)
      .default(14)
      .describe('几薪/年，例：14 / 15 / 16'),
  }),
});
