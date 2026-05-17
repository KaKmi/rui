import { createAnthropic } from '@ai-sdk/anthropic';

/**
 * 小米 MiMo 客户端封装。
 *
 * 与 Claude 的两处兼容性差异（已在 smoke 验证）：
 *   1. baseURL 必须包含 `/v1` 后缀（SDK 内部会再拼 `/messages`）。
 *      `.env` 写 `https://token-plan-cn.xiaomimimo.com/anthropic/v1`。
 *
 *   2. MiMo 默认开 thinking mode，且要求 `reasoning_content` 在多轮 tool
 *      调用里回传给 API；`@ai-sdk/anthropic` 默认不带 thinking 字段也
 *      不回填 reasoning，于是多轮 tool 第二次请求会 400。
 *      解决：用 fetch 拦截器在 body 里强制塞 `thinking: {type:'disabled'}`，
 *      让 MiMo 跳过思考链路。
 *      （SDK 的 providerOptions.anthropic.thinking 在本版本不会写入请求体，
 *      sendReasoning 也帮不上 —— MiMo 用的是非标 `reasoning_content` 字段。）
 */

const baseURL = process.env.MIMO_BASE_URL;
const apiKey = process.env.MIMO_API_KEY;
const modelId = process.env.MIMO_MODEL ?? 'mimo-v2.5-pro';

if (!baseURL || !apiKey) {
  // 故意在模块加载时报错；route handler 调用时栈更清楚。
  throw new Error(
    'MIMO_BASE_URL or MIMO_API_KEY missing. See .env.example for the format.',
  );
}

const mimoFetch: typeof fetch = async (input, init) => {
  if (init?.body && typeof init.body === 'string') {
    try {
      const body = JSON.parse(init.body);
      body.thinking = { type: 'disabled' };
      init = { ...init, body: JSON.stringify(body) };
    } catch {
      // 非 JSON 请求（罕见），原样放行
    }
  }
  return fetch(input as URL, init);
};

export const mimo = createAnthropic({ baseURL, apiKey, fetch: mimoFetch });
export const mimoModel = mimo(modelId);
export const MIMO_MODEL_ID = modelId;
