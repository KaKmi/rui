import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ScoreRing } from '@/components/ui/ScoreRing';

describe('ScoreRing — rendered tone class at 5 points', () => {
  it.each([
    [0, 'low'],
    [55, 'mid'],
    [70, ''],
    [85, 'high'],
    [100, 'high'],
  ] as const)('value=%i applies fill class "%s"', (value, expected) => {
    const { container } = render(<ScoreRing value={value} />);
    const fill = container.querySelector('circle.fill');
    expect(fill).toBeTruthy();
    const classes = (fill!.getAttribute('class') ?? '').split(/\s+/);
    if (expected === '') {
      // 70-84 走默认 neon，无附加 tone class
      expect(classes).toEqual(['fill']);
    } else {
      expect(classes).toContain(expected);
    }
  });

  it('value=null renders unscored ring (dashed track + 「—」 text)', () => {
    const { container, getByText } = render(<ScoreRing value={null} />);
    const track = container.querySelector('circle.track');
    expect(track?.getAttribute('stroke-dasharray')).toBe('3 4');
    expect(container.querySelector('circle.fill')).toBeNull();
    expect(getByText('—')).toBeTruthy();
  });
});
