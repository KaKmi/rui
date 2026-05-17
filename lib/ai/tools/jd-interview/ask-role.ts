import { tool } from 'ai';
import { z } from 'zod';

/**
 * 问岗位名称。HITL tool —— 无 execute，前端 widget 收集 + addToolResult 回灌。
 */
export const askRole = tool({
  description:
    '询问要招的岗位名称（例："高级前端工程师"）。' +
    '需要时机：你不知道用户要招什么岗位。已知则跳过。',
  inputSchema: z.object({
    question: z.string().describe('给用户的提问，简洁口语化'),
    presets: z
      .array(z.string())
      .default([
        '高级前端工程师',
        'AI 产品经理',
        '算法工程师',
        '资深 UI 设计师',
      ])
      .describe('快捷点选项，3-5 个'),
  }),
  outputSchema: z.object({
    value: z.string().describe('用户填的或选的岗位名称'),
  }),
});
