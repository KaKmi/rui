import * as React from 'react';
import { cn } from '@/lib/cn';

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  error?: boolean;
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { error, className, children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn('select', error && 'is-error', className)}
      aria-invalid={error || undefined}
      {...rest}
    >
      {children}
    </select>
  );
});
