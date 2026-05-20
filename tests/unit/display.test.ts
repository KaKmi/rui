import { describe, expect, it } from 'vitest';
import { compactList, formatJobLabel, truncateText } from '@/lib/display';

describe('display helpers', () => {
  it('truncates long text with a single ellipsis slot', () => {
    expect(truncateText('123456789', 8)).toBe('1234567…');
    expect(truncateText('12345678', 8)).toBe('12345678');
  });

  it('returns fallback for blank text', () => {
    expect(truncateText('   ', 8, '候选人 R-TEST')).toBe('候选人 R-TEST');
  });

  it('splits compact lists into visible items and hidden count', () => {
    expect(compactList(['React', 'Node', 'SQL'], 2)).toEqual({
      visible: ['React', 'Node'],
      hidden: 1,
    });
  });

  it('formats jobs as title plus business id', () => {
    expect(formatJobLabel({ id: 'JD-2024-0118', title: '高级前端工程师' })).toBe(
      '高级前端工程师（JD-2024-0118）',
    );
  });
});
