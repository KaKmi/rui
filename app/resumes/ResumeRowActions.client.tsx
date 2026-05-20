'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Send, X } from '@/components/icons/Icon';
import { Chip } from '@/components/ui/Chip';
import { useToast } from '@/lib/store/toast';
import type { ResumeStatus } from '@/types';

/**
 * 简历池表格行的紧凑操作：邀面 / 不合适。
 *
 * 行为：
 *   - 已邀面 / 已 offer → 只显示状态 chip
 *   - 已淘汰 → 只显示状态 chip
 *   - 解析失败 → 不可操作（按钮全灰）
 *   - 其他态 → 两个图标按钮
 *
 * 与详情页 ResumeActions.client 共用同一组 API，按钮尺寸更小。
 */
export function ResumeRowActions({
  resumeId,
  name,
  status,
}: {
  resumeId: string;
  name: string;
  status: ResumeStatus;
}) {
  const router = useRouter();
  const pushToast = useToast((s) => s.push);
  const [pending, setPending] = React.useState<'invite' | 'reject' | null>(null);

  const stop = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  if (status === '已邀面' || status === '已 offer') {
    return <Chip variant="ok">{status}</Chip>;
  }
  if (status === '已淘汰') {
    return <Chip variant="muted">已淘汰</Chip>;
  }
  if (status === '解析失败') {
    return <Chip variant="bad">解析失败</Chip>;
  }

  async function run(action: 'invite' | 'reject', e: React.MouseEvent) {
    stop(e);
    if (pending) return;
    setPending(action);
    try {
      const res = await fetch(`/api/resumes/${encodeURIComponent(resumeId)}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: action === 'reject' ? JSON.stringify({}) : undefined,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        pushToast({ text: data.error ?? '操作失败，请重试', tone: 'bad' });
        return;
      }
      pushToast({
        text: action === 'invite' ? `已邀约 ${name} 面试` : `已将 ${name} 标记为不合适`,
        tone: action === 'invite' ? 'ok' : 'info',
      });
      router.refresh();
    } catch (err) {
      pushToast({
        text: err instanceof Error ? err.message : '网络异常，请重试',
        tone: 'bad',
      });
    } finally {
      setPending(null);
    }
  }

  return (
    <div style={{ display: 'inline-flex', gap: 4 }} onClick={stop}>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        title="不合适"
        aria-label={`将 ${name} 标记为不合适`}
        onClick={(e) => run('reject', e)}
        disabled={pending !== null}
      >
        {pending === 'reject' ? <span className="spin-mini" /> : <X size={12} />}
      </button>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        title="邀请面试"
        aria-label={`邀请 ${name} 面试`}
        onClick={(e) => run('invite', e)}
        disabled={pending !== null}
      >
        {pending === 'invite' ? <span className="spin-mini" /> : <Send size={12} />}
      </button>
    </div>
  );
}
