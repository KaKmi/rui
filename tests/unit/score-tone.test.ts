import { describe, expect, it } from 'vitest';
import {
  badgeVariantOfScore,
  toneOfScore,
  verdictOfScore,
} from '@/lib/score-tone';

/**
 * spec §6.6.8 阈值五点回归。
 * 任何一项失败都意味着 ScoreRing / BarScore / Badge 配色在四个分段之一漂移。
 */
describe('toneOfScore — 5 point thresholds (spec §6.6.8)', () => {
  it.each([
    [0, 'low', 'bad', '不建议'],
    [55, 'mid', 'bad', '偏弱'],
    [70, '', 'warn', '可考虑'],
    [85, 'high', 'ok', '强匹配'],
    [100, 'high', 'ok', '强匹配'],
  ] as const)('value=%i → ringClass=%s, badge=%s, verdict=%s', (v, ring, badge, verdict) => {
    expect(toneOfScore(v)).toBe(ring);
    expect(badgeVariantOfScore(v)).toBe(badge);
    expect(verdictOfScore(v)).toBe(verdict);
  });

  it('boundaries: 54 falls into low (<55), 69 stays mid (<70), 84 stays default (<85)', () => {
    expect(toneOfScore(54)).toBe('low');
    expect(toneOfScore(69)).toBe('mid');
    expect(toneOfScore(84)).toBe('');
  });
});
