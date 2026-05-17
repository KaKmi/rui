import { tool, generateText } from 'ai';
import { z } from 'zod';
import { mimoModel } from '@/lib/ai/mimo';

/**
 * 生成四段式 JD markdown：## 岗位介绍 / ## 工作职责 / ## 任职要求 / ## 加分项
 *
 * 实现策略：本工具的 execute 内部用 generateText 二次调 MiMo，专门让它
 * 按四段式格式输出 JD（系统提示与对话上下文剥离，避免被打断）。
 * 返回完整 markdown 文本，前端 ChatStream 监听到 `generate_jd` 的 tool-result
 * 时把内容路由到右侧 JDDraft 画布。
 *
 * （token-by-token 直接流到 canvas 的方案在 M2.3 状态机改造时再做。）
 */
export const generateJD = tool({
  description:
    '根据用户提供的岗位输入，生成一份四段式 JD markdown。' +
    '需要时机：用户明确想"写/起草/生成 JD"。',
  inputSchema: z.object({
    title: z.string().describe('岗位名称，例：高级前端工程师'),
    dept: z.string().describe('部门 / 业务组，例：技术中心 · Web 平台组'),
    level: z.string().describe('职级，例：P7'),
    location: z.string().describe('工作地，多地用 " / " 分隔'),
    salary: z.string().describe('薪资范围，例：30-55K · 16薪'),
    headcount: z.number().int().positive().describe('招聘人数'),
    mustHave: z.array(z.string()).describe('必备技能/经验关键词，3-6 条'),
    niceToHave: z.array(z.string()).optional().describe('加分项关键词，0-4 条'),
  }),
  execute: async (input) => {
    const prompt = `请为以下岗位写一份 JD，严格四段式，全部使用中文 markdown：

岗位信息：
- 名称：${input.title}
- 部门：${input.dept}
- 职级：${input.level}
- 工作地：${input.location}
- 薪资：${input.salary}
- 人数：${input.headcount}
- 必备：${input.mustHave.join('、')}
${input.niceToHave?.length ? `- 加分：${input.niceToHave.join('、')}` : ''}

格式要求（必须严格按此四个标题）：
## 岗位介绍
（一段，60-120 字，写"我们在做什么 / 你将参与什么"）

## 工作职责
（4 条无序列表，每条一句话，动词开头）

## 任职要求
（4-5 条无序列表，对应必备）

## 加分项
（2-3 条无序列表；若没有 niceToHave 也要写 2 条合理的）

不要写"我们提供"、"福利"、"联系方式"这类内容。不要客套。`;

    const { text } = await generateText({
      model: mimoModel,
      prompt,
    });

    return {
      kind: 'jd-draft' as const,
      meta: {
        title: input.title,
        dept: input.dept,
        level: input.level,
        location: input.location,
        salary: input.salary,
        headcount: input.headcount,
        skills: input.mustHave,
      },
      markdown: text,
    };
  },
});
