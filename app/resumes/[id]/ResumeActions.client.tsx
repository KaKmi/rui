'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Send, X, Refresh } from '@/components/icons/Icon';
import { useToast } from '@/lib/store/toast';

type Status =
  | '解析失败'
  | '待评分'
  | 'AI 已评分'
  | '已邀面'
  | '已 offer'
  | '已淘汰';

type Action = 'invite' | 'reject' | 'rescore';

export function ResumeActions({
  resumeId,
  name,
  status,
  canRescore,
}: {
  resumeId: string;
  name: string;
  status: Status;
  /** parsedText 非空时为 true；为 false 时"重新评分"按钮藏起来 */
  canRescore: boolean;
}) {
  const router = useRouter();
  const pushToast = useToast((s) => s.push);
  const [pending, setPending] = React.useState<Action | null>(null);

  const invited = status === '已邀面' || status === '已 offer';
  const rejected = status === '已淘汰';

  async function run(action: Action) {
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
            ? `已向 ${name} 发送面试邀约（mock）`
            : action === 'reject'
              ? `已将 ${name} 标记为不合适`
              : `${name} 重新评分完成`,
        tone: action === 'reject' ? 'info' : 'ok',
      });
      router.refresh();
    } catch (e) {
      pushToast({
        text: e instanceof Error ? e.message : '网络异常，请重试',
        tone: 'bad',
      });
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      {canRescore && (
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => run('rescore')}
          disabled={pending !== null}
          title="用当前 JD 重新跑一次 AI 评分（耗时 ~10s）"
        >
          {pending === 'rescore' ? <span className="spin-mini" /> : <Refresh size={12} />} 重新评分
        </button>
      )}
      <button
        type="button"
        className="btn btn-sm"
        onClick={() => run('reject')}
        disabled={rejected || pending !== null}
        title={rejected ? '已标记为不合适' : '将该候选人标记为不合适'}
      >
        {pending === 'reject' ? (
          <span className="spin-mini" />
        ) : (
          <X size={12} />
        )}{' '}
        {rejected ? '已淘汰' : '不合适'}
      </button>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={() => run('invite')}
        disabled={invited || rejected || pending !== null}
        title={
          rejected
            ? '已标记为不合适，先恢复后再邀面'
            : invited
              ? '已发送邀约'
              : '推进到面试'
        }
      >
        {pending === 'invite' ? (
          <span className="spin-mini" />
        ) : (
          <Send size={12} />
        )}{' '}
        {invited ? '已邀面' : '邀请面试'}
      </button>
    </>
  );
}
