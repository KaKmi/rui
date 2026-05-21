'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Refresh, Send, X } from '@/components/icons/Icon';
import { Chip } from '@/components/ui/Chip';
import { useToast } from '@/lib/store/toast';
import type { ResumeStatus } from '@/types';

/**
 * 简历池表格行的紧凑操作：邀面 / 不合适 / 重评。
 *
 * 行为：
 *   - 已邀面 / 已 offer → 状态 chip（终态，不再操作）
 *   - 已淘汰 → 状态 chip
 *   - 解析失败 → 状态 chip
 *   - 待评分 / AI 已评分 → 三个图标按钮（reject · rescore · invite）
 *
 * 与详情页 ResumeActions.client 共用同一组 API，按钮尺寸更小。
 */
type Action = 'invite' | 'reject' | 'rescore';

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
  const [pending, setPending] = React.useState<Action | null>(null);

  const stopEvt = (e: React.MouseEvent) => {
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

  async function run(action: Action, e: React.MouseEvent) {
    stopEvt(e);
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
        text:
          action === 'invite'
            ? `已邀约 ${name} 面试`
            : action === 'reject'
              ? `已将 ${name} 标记为不合适`
              : `${name} 重新评分完成`,
        tone: action === 'reject' ? 'info' : 'ok',
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
    <div style={{ display: 'inline-flex', gap: 4 }} onClick={stopEvt}>
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
        className="btn btn-ghost btn-sm"
        title="重新评分（用当前 JD 重评一次）"
        aria-label={`重新评分 ${name}`}
        onClick={(e) => run('rescore', e)}
        disabled={pending !== null}
      >
        {pending === 'rescore' ? <span className="spin-mini" /> : <Refresh size={12} />}
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
