'use client';

import * as React from 'react';
import { useToast, type Toast as ToastItem } from '@/lib/store/toast';
import { cn } from '@/lib/cn';

const TONE_CLS: Record<ToastItem['tone'], string> = {
  default: '',
  ok: 'badge-ok',
  warn: 'badge-warn',
  bad: 'badge-bad',
  info: 'badge-cyan',
};

/**
 * spec §6.6.6：bottom-right · 4s · 堆叠 3
 * 渲染层只负责呈现；自动关闭逻辑在 useToast.push 中 setTimeout。
 */
export function Toaster() {
  const items = useToast((s) => s.items);
  const dismiss = useToast((s) => s.dismiss);

  if (items.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        right: 'var(--s-5)',
        bottom: 'var(--s-5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 60,
        pointerEvents: 'none',
      }}
      aria-live="polite"
    >
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          onClick={() => dismiss(t.id)}
          className={cn('card', 'card-pad', 'fade-up', TONE_CLS[t.tone])}
          style={{
            minWidth: 240,
            maxWidth: 360,
            cursor: 'pointer',
            pointerEvents: 'auto',
            padding: '10px 14px',
            fontSize: 'var(--t-md)',
            color: 'var(--fg-0)',
            boxShadow: 'var(--shadow-pop)',
          }}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
