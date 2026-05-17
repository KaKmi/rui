import * as React from 'react';

export type SectionTitleProps = {
  children: React.ReactNode;
  hint?: React.ReactNode;
  action?: React.ReactNode;
};

export function SectionTitle({ children, hint, action }: SectionTitleProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        marginBottom: 'var(--s-3)',
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: 'var(--fg-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: 500,
        }}
      >
        {children}
      </div>
      {hint && <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{hint}</div>}
      <div style={{ flex: 1 }} />
      {action}
    </div>
  );
}
