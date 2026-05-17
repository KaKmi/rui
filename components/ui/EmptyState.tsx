import * as React from 'react';
import { Sparkle } from '@/components/icons/Icon';
import { Button } from './Button';

export type EmptyStateProps = {
  title: string;
  hint?: string;
  cta?: { label: string; onClick?: () => void; href?: string };
  icon?: React.ReactNode;
};

export function EmptyState({ title, hint, cta, icon }: EmptyStateProps) {
  return (
    <div className="canvas-empty">
      <div className="canvas-empty-inner">
        <div className="canvas-empty-mark">{icon ?? <Sparkle size={22} />}</div>
        <div className="canvas-empty-title">{title}</div>
        {hint && <div className="canvas-empty-sub">{hint}</div>}
        {cta && (
          <div style={{ marginTop: 16 }}>
            {cta.href ? (
              <a className="btn btn-primary" href={cta.href}>
                {cta.label}
              </a>
            ) : (
              <Button variant="primary" onClick={cta.onClick}>
                {cta.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
