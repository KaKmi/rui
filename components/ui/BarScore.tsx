import * as React from 'react';
import { cn } from '@/lib/cn';
import { toneOfScore } from '@/lib/score-tone';

export type BarScoreProps = {
  value: number;
  label: string;
  labelWidth?: number;
  className?: string;
};

export function BarScore({ value, label, labelWidth = 80, className }: BarScoreProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const tone = toneOfScore(clamped);

  return (
    <div className={cn('bar-row', className)} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: labelWidth, fontSize: 12, color: 'var(--fg-2)' }}>{label}</div>
      <div className="bar-track" style={{ flex: 1 }}>
        <div className={cn('bar-fill', tone)} style={{ width: `${clamped}%` }} />
      </div>
      <div
        style={{
          width: 32,
          textAlign: 'right',
          fontSize: 12,
          color: 'var(--fg-0)',
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 600,
        }}
      >
        {clamped}
      </div>
    </div>
  );
}
