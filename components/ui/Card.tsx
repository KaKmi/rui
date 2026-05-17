import * as React from 'react';
import { cn } from '@/lib/cn';

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  pad?: boolean;
  clickable?: boolean;
};

export function Card({ pad = false, clickable = false, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn('card', pad && 'card-pad', clickable && 'is-clickable', className)}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      {...rest}
    >
      {children}
    </div>
  );
}
