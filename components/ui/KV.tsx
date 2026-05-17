import * as React from 'react';

export type KVProps = {
  k: React.ReactNode;
  v: React.ReactNode;
  /** key 列最小宽度，默认 48 */
  kMinWidth?: number;
};

export function KV({ k, v, kMinWidth = 48 }: KVProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        fontSize: 12,
        color: 'var(--fg-1)',
        minWidth: 0,
      }}
    >
      <span style={{ color: 'var(--fg-3)', flex: 'none', minWidth: kMinWidth }}>{k}</span>
      <span
        style={{
          color: 'var(--fg-0)',
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {v}
      </span>
    </div>
  );
}
