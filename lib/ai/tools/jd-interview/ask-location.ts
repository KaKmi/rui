import { tool } from 'ai';
import { z } from 'zod';

export const askLocation = tool({
  description:
    '询问工作地（可多选）。需要时机：你不知道岗位所在城市。已知则跳过。',
  inputSchema: z.object({
    question: z.string().describe('给用户的提问'),
    presets: z
      .array(z.string())
      .default(['杭州', '上海', '北京', '深圳', '广州', '成都', '远程'])
      .describe('城市快捷选项'),
  }),
  outputSchema: z.object({
    values: z.array(z.string()).min(1).describe('用户选定的一个或多个城市'),
  }),
});
