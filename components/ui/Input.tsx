import * as React from 'react';
import { cn } from '@/lib/cn';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { error, className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn('input', error && 'is-error', className)}
      aria-invalid={error || undefined}
      {...rest}
    />
  );
});
