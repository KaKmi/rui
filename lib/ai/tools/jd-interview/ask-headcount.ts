import { tool } from 'ai';
import { z } from 'zod';

export const askHeadcount = tool({
  description:
    '询问招聘人数 (HC)。需要时机：你不知道要招几个人。已知则跳过。',
  inputSchema: z.object({
    question: z.string().describe('给用户的提问'),
  }),
  outputSchema: z.object({
    value: z.number().int().min(1).max(50).describe('招聘人数，最少 1'),
  }),
});
