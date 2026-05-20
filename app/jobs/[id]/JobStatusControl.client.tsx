'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Pause, Send, X, Check } from '@/components/icons/Icon';
import { useToast } from '@/lib/store/toast';
import type { JobStatus } from '@/types';

/**
 * 职位状态切换按钮组。spec §6.3 状态机：
 *   草稿     → [发布] [关闭]
 *   招聘中   → [暂停] [关闭]
 *   已暂停   → [恢复] [关闭]
 *   已关闭   → 终态，无按钮
 *
 * 「关闭」需要二次确认（不可逆 + 影响候选人投递）。
 */
const STATUS_BUTTONS: Record<
  JobStatus,
  Array<{
    target: JobStatus;
    label: string;
    icon: 'play' | 'pause' | 'close';
    confirm?: { title: string; message: string };
    primary?: boolean;
  }>
> = {
  草稿: [
    {
      target: '招聘中',
      label: '发布',
      icon: 'play',
      primary: true,
    },
    {
      target: '已关闭',
      label: '关闭',
      icon: 'close',
      confirm: {
        title: '关闭这条 JD？',
        message: '关闭后无法再恢复，候选人也无法再投递。建议先确认没有未处理的简历。',
      },
    },
  ],
  招聘中: [
    { target: '已暂停', label: '暂停', icon: 'pause' },
    {
      target: '已关闭',
      label: '关闭',
      icon: 'close',
      confirm: {
        title: '关闭这条 JD？',
        message: '关闭后无法再恢复，候选人也无法再投递。',
      },
    },
  ],
  已暂停: [
    { target: '招聘中', label: '恢复', icon: 'play', primary: true },
    {
      target: '已关闭',
      label: '关闭',
      icon: 'close',
      confirm: {
        title: '关闭这条 JD？',
        message: '关闭后无法再恢复，候选人也无法再投递。',
      },
    },
  ],
  已关闭: [],
};

function StatusIcon({ kind, size = 12 }: { kind: 'play' | 'pause' | 'close'; size?: number }) {
  if (kind === 'pause') return <Pause size={size} />;
  if (kind === 'close') return <X size={size} />;
  return <Send size={size} />;
}

export function JobStatusControl({
  jobId,
  status,
}: {
  jobId: string;
  status: JobStatus;
}) {
  const router = useRouter();
  const pushToast = useToast((s) => s.push);
  const [pending, setPending] = React.useState<JobStatus | null>(null);
  const [confirmTarget, setConfirmTarget] = React.useState<{
    target: JobStatus;
    title: string;
    message: string;
  } | null>(null);

  const buttons = STATUS_BUTTONS[status];

  async function changeStatus(target: JobStatus) {
    if (pending) return;
    setPending(target);
    try {
      const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: target }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        pushToast({ text: data.error ?? '状态切换失败', tone: 'bad' });
        return;
      }
      pushToast({
        text: `${jobId} 已切换为「${target}」`,
        tone: target === '已关闭' ? 'info' : 'ok',
      });
      router.refresh();
    } catch (e) {
      pushToast({
        text: e instanceof Error ? e.message : '网络异常，请重试',
        tone: 'bad',
      });
    } finally {
      setPending(null);
      setConfirmTarget(null);
    }
  }

  if (buttons.length === 0) return null;

  return (
    <>
      {buttons.map((b) => (
        <button
          key={b.target}
          type="button"
          className={`btn btn-sm ${b.primary ? 'btn-primary' : ''}`}
          disabled={pending !== null}
          onClick={() => {
            if (b.confirm) {
              setConfirmTarget({
                target: b.target,
                title: b.confirm.title,
                message: b.confirm.message,
              });
            } else {
              void changeStatus(b.target);
            }
          }}
        >
          {pending === b.target ? (
            <span className="spin-mini" />
          ) : (
            <StatusIcon kind={b.icon} />
          )}{' '}
          {b.label}
        </button>
      ))}

      {confirmTarget && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 70,
          }}
          onClick={() => {
            if (!pending) setConfirmTarget(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              minWidth: 360,
              maxWidth: 480,
              background: 'var(--bg-2)',
              border: '1px solid var(--line-1)',
              borderRadius: 'var(--r-4)',
              padding: 'var(--s-5)',
              boxShadow: 'var(--shadow-pop)',
            }}
          >
            <div style={{ fontSize: 'var(--t-lg)', fontWeight: 600, color: 'var(--fg-0)' }}>
              {confirmTarget.title}
            </div>
            <div
              style={{
                marginTop: 8,
                color: 'var(--fg-2)',
                fontSize: 'var(--t-md)',
                lineHeight: 1.55,
              }}
            >
              {confirmTarget.message}
            </div>
            <div
              style={{
                display: 'flex',
                gap: 8,
                marginTop: 'var(--s-4)',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setConfirmTarget(null)}
                disabled={pending !== null}
              >
                取消
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => void changeStatus(confirmTarget.target)}
                disabled={pending !== null}
              >
                {pending !== null ? <span className="spin-mini" /> : <Check size={12} />}{' '}
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
