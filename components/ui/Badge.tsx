import * as React from 'react';
import { cn } from '@/lib/cn';
import type { BadgeVariant } from '@/lib/score-tone';

export type { BadgeVariant };

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant | 'default';
};

const VARIANT_CLS: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: '',
  neon: 'badge-neon',
  cyan: 'badge-cyan',
  ok: 'badge-ok',
  warn: 'badge-warn',
  bad: 'badge-bad',
  muted: 'badge-muted',
};

export function Badge({ variant = 'default', className, children, ...rest }: BadgeProps) {
  return (
    <span className={cn('badge', VARIANT_CLS[variant], className)} {...rest}>
      {children}
    </span>
  );
}
