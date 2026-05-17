'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

const LABELS: Record<string, string> = {
  '/chat': '对话',
  '/jobs': '职位',
  '/resumes': '简历池',
};

type Status = 'online' | 'offline' | 'unknown';
type Health = { status: 'online' | 'offline'; latencyMs?: number; error?: string };

const POLL_MS = 30_000;

export function TopBar() {
  const pathname = usePathname();
  const root = `/${pathname.split('/')[1] ?? ''}`;
  const label = LABELS[root] ?? '工作台';

  const [status, setStatus] = React.useState<Status>('unknown');
  const [latency, setLatency] = React.useState<number | undefined>();
  const [error, setError] = React.useState<string | undefined>();

  const probe = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/health', { signal, cache: 'no-store' });
      const j = (await res.json()) as Health;
      setStatus(j.status);
      setLatency(j.latencyMs);
      setError(j.error);
    } catch (e) {
      if ((e as { name?: string }).name === 'AbortError') return;
      setStatus('offline');
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  React.useEffect(() => {
    const ctrl = new AbortController();
    void probe(ctrl.signal);
    const id = setInterval(() => void probe(), POLL_MS);
    return () => {
      ctrl.abort();
      clearInterval(id);
    };
  }, [probe]);

  return (
    <header className="topbar">
      <div className="crumbs">
        <span>工作台</span>
        <span className="sep">/</span>
        <span className="now">{label}</span>
      </div>
      <div className="topbar-spacer" />
      <StatusPill status={status} latency={latency} error={error} onRetry={() => void probe()} />
    </header>
  );
}

function StatusPill({
  status,
  latency,
  error,
  onRetry,
}: {
  status: Status;
  latency?: number;
  error?: string;
  onRetry: () => void;
}) {
  if (status === 'offline') {
    return (
      <button
        type="button"
        className="pill"
        onClick={onRetry}
        title={error ?? '点击重试'}
        style={{
          background: 'var(--bad-bg)',
          color: 'var(--bad)',
          borderColor: 'rgba(248,113,113,0.25)',
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: 'var(--bad)',
          }}
        />
        Agent 暂时不可用
      </button>
    );
  }
  if (status === 'unknown') {
    return (
      <span
        className="pill"
        style={{
          background: 'rgba(255,255,255,0.04)',
          color: 'var(--fg-3)',
          borderColor: 'var(--line-1)',
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: 'var(--fg-3)',
          }}
        />
        探测中…
      </span>
    );
  }
  return (
    <span className="pill" title={latency !== undefined ? `${latency}ms` : undefined}>
      Agent 在线
    </span>
  );
}
