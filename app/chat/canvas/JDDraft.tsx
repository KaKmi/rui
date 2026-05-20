'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Check, PenLine } from '@/components/icons/Icon';
import { Chip } from '@/components/ui/Chip';
import { useToast } from '@/lib/store/toast';
import { Markdown } from './Markdown';

export type JDDraftData = {
  meta: {
    title: string;
    dept: string;
    level: string;
    location: string;
    salary: string;
    headcount: number;
    skills: string[];
  };
  markdown: string;
};

export function JDDraft({ data }: { data: JDDraftData }) {
  const router = useRouter();
  const pushToast = useToast((s) => s.push);
  const [saving, setSaving] = React.useState(false);
  const [savedJobId, setSavedJobId] = React.useState<string | null>(null);

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(data.markdown);
      pushToast({ text: 'JD markdown 已复制', tone: 'info' });
    } catch {
      pushToast({ text: '复制失败，浏览器可能未授予剪贴板权限', tone: 'bad' });
    }
  }

  async function saveAsJob() {
    if (saving || savedJobId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/chat/save-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        jobId?: string;
        error?: string;
      };
      if (!res.ok || !body.jobId) {
        pushToast({ text: body.error ?? '保存失败，请重试', tone: 'bad' });
        return;
      }
      setSavedJobId(body.jobId);
      pushToast({ text: `已保存为 ${body.jobId}（草稿状态，可在职位管理中发布）`, tone: 'ok' });
      router.refresh();
    } catch (e) {
      pushToast({
        text: e instanceof Error ? e.message : '网络异常，请重试',
        tone: 'bad',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="jd-draft">
      <div className="jd-draft-header">
        <div>
          <div style={{ fontSize: 'var(--t-lg)', fontWeight: 600, color: 'var(--fg-0)' }}>
            {data.meta.title}
          </div>
          <div className="jd-draft-meta">
            {data.meta.dept} · {data.meta.level} · {data.meta.location} · {data.meta.salary} · HC{' '}
            {data.meta.headcount}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {data.meta.skills.map((s) => (
          <Chip key={s} variant="neon">
            {s}
          </Chip>
        ))}
      </div>

      <div className="jd-md">
        <Markdown source={data.markdown} />
      </div>

      <div className="jd-draft-foot">
        <button
          type="button"
          className="btn btn-sm"
          title="让 Rui 改写一版（M4 待接入）"
          disabled
        >
          <PenLine size={12} /> 改写
        </button>
        <button type="button" className="btn btn-sm" onClick={copyMarkdown}>
          <Copy size={12} /> 复制
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          style={{ marginLeft: 'auto' }}
          onClick={saveAsJob}
          disabled={saving || savedJobId !== null}
        >
          {saving ? <span className="spin-mini" /> : <Check size={12} />}{' '}
          {savedJobId ? `已保存 ${savedJobId}` : '保存为职位'}
        </button>
      </div>
    </div>
  );
}
