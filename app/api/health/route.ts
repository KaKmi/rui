import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { mimoModel, MIMO_MODEL_ID } from '@/lib/ai/mimo';

/**
 * MiMo 探活接口 —— spec §6.6.9
 *
 * 实现选择：用 1-token generateText 真实打一次端到端；最廉价的"可达性 + 鉴权 + 推理"三合一验证。
 * 用进程内 30s TTL 缓存避免高频探活把 token 消耗刷上去。
 *
 * 返回：
 *   200 {status: 'online', latencyMs, cachedAt}
 *   503 {status: 'offline', error, cachedAt}
 *
 * 客户端（TopBar）以 30-60s 间隔轮询足够。
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_TTL_MS = 30_000;

type HealthEntry = {
  status: 'online' | 'offline';
  latencyMs?: number;
  error?: string;
  at: number;
};

// 进程内单例缓存；serverless 冷启动会丢，是可接受的。
const g = globalThis as unknown as { __mimoHealth?: HealthEntry };

async function probe(): Promise<HealthEntry> {
  const t0 = Date.now();
  try {
    await generateText({
      model: mimoModel,
      prompt: 'ok',
      maxOutputTokens: 1,
    });
    return { status: 'online', latencyMs: Date.now() - t0, at: Date.now() };
  } catch (e) {
    return {
      status: 'offline',
      error: e instanceof Error ? e.message : String(e),
      latencyMs: Date.now() - t0,
      at: Date.now(),
    };
  }
}

export async function GET() {
  const now = Date.now();
  if (!g.__mimoHealth || now - g.__mimoHealth.at > CACHE_TTL_MS) {
    g.__mimoHealth = await probe();
  }
  const h = g.__mimoHealth;
  return NextResponse.json(
    {
      status: h.status,
      model: MIMO_MODEL_ID,
      latencyMs: h.latencyMs,
      cachedAt: h.at,
      ...(h.error ? { error: h.error } : {}),
    },
    { status: h.status === 'online' ? 200 : 503 },
  );
}
