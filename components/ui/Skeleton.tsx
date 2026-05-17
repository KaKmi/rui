import * as React from 'react';
import { cn } from '@/lib/cn';

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  /** 宽度：数字 → px；字符串原样使用（'100%', '8ch'...） */
  w?: number | string;
  /** 高度：数字 → px */
  h?: number | string;
  /** 圆角覆盖：默认 var(--r-2)；'pill' 走 var(--r-pill) */
  radius?: number | string | 'pill';
};

function toCss(v: number | string | undefined): string | undefined {
  if (v === undefined) return undefined;
  return typeof v === 'number' ? `${v}px` : v;
}

export function Skeleton({ w, h = 12, radius, className, style, ...rest }: SkeletonProps) {
  const borderRadius =
    radius === 'pill' ? 'var(--r-pill)' : toCss(radius) ?? 'var(--r-2)';
  return (
    <div
      className={cn('shimmer', className)}
      aria-hidden="true"
      style={{
        width: toCss(w) ?? '100%',
        height: toCss(h),
        borderRadius,
        ...style,
      }}
      {...rest}
    />
  );
}
