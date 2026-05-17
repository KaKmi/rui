import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Tokens 是设计契约的硬约束（spec §10）：
 *  1. :root 必须定义 --neon-1 / --ok / --warn / --bad 等阈值色
 *  2. 阈值色的具体 hex 不允许漂移（防止有人偷偷换调色板）
 *  3. .score-ring .fill 的三档 (high/mid/low) 必须存在
 */
const css = readFileSync(resolve(__dirname, '../../app/globals.css'), 'utf8');

describe('globals.css — token contract', () => {
  it('defines required color tokens at :root', () => {
    const tokens = ['--neon-1', '--neon-2', '--ok', '--warn', '--bad', '--info'];
    for (const t of tokens) {
      expect(css, `missing token: ${t}`).toMatch(new RegExp(`${t}:\\s*[^;]+;`));
    }
  });

  it('locks threshold hex values (prevent silent palette drift)', () => {
    expect(css).toMatch(/--neon-1:\s*#a78bfa/);
    expect(css).toMatch(/--ok:\s*#4ade80/);
    expect(css).toMatch(/--warn:\s*#fbbf24/);
    expect(css).toMatch(/--bad:\s*#f87171/);
  });

  it('defines .score-ring .fill tone classes (high/mid/low)', () => {
    expect(css).toMatch(/\.score-ring \.fill\.high/);
    expect(css).toMatch(/\.score-ring \.fill\.mid/);
    expect(css).toMatch(/\.score-ring \.fill\.low/);
  });

  it('defines .bar-fill tone classes (high/mid/low)', () => {
    expect(css).toMatch(/\.bar-fill\.high/);
    expect(css).toMatch(/\.bar-fill\.mid/);
    expect(css).toMatch(/\.bar-fill\.low/);
  });
});
