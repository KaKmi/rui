import * as React from 'react';
import { cn } from '@/lib/cn';
import { toneOfScore } from '@/lib/score-tone';

export type ScoreRingProps = {
  /** 0-100；传 null 表示未评分，渲染为虚线轨道 + 「—」 */
  value: number | null;
  size?: number;
  stroke?: number;
  showNum?: boolean;
  className?: string;
};

export function ScoreRing({
  value,
  size = 56,
  stroke = 5,
  showNum = true,
  className,
}: ScoreRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  const isUnscored = value === null || Number.isNaN(value);
  const clamped = isUnscored ? 0 : Math.max(0, Math.min(100, value));
  const off = c * (1 - clamped / 100);
  const tone = isUnscored ? '' : toneOfScore(clamped);

  return (
    <div className={cn('score-ring', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={isUnscored ? '未评分' : `评分 ${Math.round(clamped)}`}>
        <circle
          className="track"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={isUnscored ? '3 4' : undefined}
        />
        {!isUnscored && (
          <circle
            className={cn('fill', tone)}
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={c}
            strokeDashoffset={off}
            strokeLinecap="round"
          />
        )}
      </svg>
      {showNum && <div className="num">{isUnscored ? '—' : Math.round(clamped)}</div>}
    </div>
  );
}
