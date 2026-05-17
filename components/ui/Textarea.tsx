import * as React from 'react';
import { cn } from '@/lib/cn';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean;
};

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { error, className, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cn('textarea', error && 'is-error', className)}
      aria-invalid={error || undefined}
      {...rest}
    />
  );
});
