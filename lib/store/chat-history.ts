/**
 * 本地保存聊天历史，刷新 / 重开浏览器后能恢复。
 *
 * 当前简化为单会话：localStorage 只存一份 messages 数组。多会话留 v0.2。
 * 用 try/catch 包裹是因为：
 *   - 隐私模式 / 配额满 → setItem 抛错
 *   - 老版本数据格式不兼容 → parse 抛错
 * 任何异常都视为"没历史"，不阻断主流程。
 */
import type { UIMessage } from 'ai';

const STORAGE_KEY = 'rui:chat:messages';
const SCHEMA_VERSION = 1;

type Envelope = {
  v: number;
  messages: UIMessage[];
  updatedAt: number;
};

export function loadChatMessages(): UIMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const env = JSON.parse(raw) as Envelope;
    if (env?.v !== SCHEMA_VERSION || !Array.isArray(env.messages)) return [];
    return env.messages;
  } catch {
    return [];
  }
}

export function saveChatMessages(messages: UIMessage[]): void {
  if (typeof window === 'undefined') return;
  try {
    const env: Envelope = {
      v: SCHEMA_VERSION,
      messages,
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(env));
  } catch {
    // 隐私模式 / 配额满，悄悄失败
  }
}

export function clearChatMessages(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 同上
  }
}
