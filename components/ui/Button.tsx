import * as React from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'default' | 'primary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
};

const VARIANT_CLS: Record<ButtonVariant, string> = {
  default: '',
  primary: 'btn-primary',
  ghost: 'btn-ghost',
};

const SIZE_CLS: Record<ButtonSize, string> = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'default', size = 'md', icon, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn('btn', VARIANT_CLS[variant], SIZE_CLS[size], className)}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
});
