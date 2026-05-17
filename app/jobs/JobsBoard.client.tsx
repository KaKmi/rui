'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Search,
  Sparkle,
  Plus,
  Download,
  ChevronDown,
  Users,
  Calendar,
} from '@/components/icons/Icon';
import { Badge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Job, JobStatus } from '@/types';

type TabValue = 'all' | JobStatus;
type SortKey = 'createdAt' | 'resumes';

const TABS: { value: TabValue; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: '招聘中', label: '招聘中' },
  { value: '已暂停', label: '已暂停' },
  { value: '草稿', label: '草稿' },
];

const STATUS_VARIANT: Record<JobStatus, Parameters<typeof Badge>[0]['variant']> = {
  招聘中: 'ok',
  已暂停: 'warn',
  草稿: 'muted',
  已关闭: 'bad',
};

export function JobsBoard({ jobs }: { jobs: Job[] }) {
  const [tab, setTab] = React.useState<TabValue>('all');
  const [query, setQuery] = React.useState('');
  const [sort, setSort] = React.useState<SortKey>('createdAt');

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = jobs.filter((j) => {
      if (tab !== 'all' && j.status !== tab) return false;
      if (q && !`${j.title}${j.dept}${j.id}`.toLowerCase().includes(q)) return false;
      return true;
    });
    return list.sort((a, b) => {
      if (sort === 'resumes') return b.resumes - a.resumes;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [jobs, tab, query, sort]);

  const counts = React.useMemo(
    () => ({
      all: jobs.length,
      active: jobs.filter((j) => j.status === '招聘中').length,
    }),
    [jobs],
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">职位管理</div>
          <div className="page-sub">
            {counts.active} 个职位在招 · 共 {counts.all} 个
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-sm" type="button">
            <Download size={12} /> 导出
          </button>
          <Link className="btn btn-primary btn-sm" href="/chat">
            <Sparkle size={12} /> 用 Rui 起草 JD
          </Link>
          <button className="btn btn-sm" type="button">
            <Plus size={12} /> 手动新建
          </button>
        </div>
      </div>

      <div className="filter-row">
        <div className="filter-tabs">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`filter-tab${tab === t.value ? ' is-active' : ''}`}
              onClick={() => setTab(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="filter-spacer" />
        <div className="search">
          <Search size={13} />
          <input
            className="search-input"
            placeholder="搜索岗位、部门或 JD 编号"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="filter-select">
          <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>排序</span>
          <select
            className="select-bare"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            <option value="createdAt">最新创建</option>
            <option value="resumes">简历最多</option>
          </select>
          <ChevronDown size={12} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="没找到匹配的职位"
          hint="换个 tab 或者清掉搜索词试试。"
          cta={{ label: '新建 JD', href: '/chat' }}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 'var(--s-4)',
          }}
        >
          {filtered.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </div>
      )}
    </div>
  );
}

function JobCard({ job }: { job: Job }) {
  const variant = STATUS_VARIANT[job.status];
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="card card-pad"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--s-3)',
        textDecoration: 'none',
        transition: 'border-color 120ms, transform 120ms',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div className="job-avatar">
          <Briefcase size={14} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 'var(--t-lg)',
                fontWeight: 600,
                color: 'var(--fg-0)',
                letterSpacing: '-0.01em',
              }}
            >
              {job.title}
            </div>
            <Badge variant={variant}>{job.status}</Badge>
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>
            {job.id} · {job.dept}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--s-3)',
          fontSize: 'var(--t-sm)',
          color: 'var(--fg-2)',
        }}
      >
        <span>
          <strong style={{ color: 'var(--fg-1)' }}>{job.level}</strong>
        </span>
        <span>·</span>
        <span>{job.location}</span>
        <span>·</span>
        <span style={{ color: 'var(--fg-1)' }}>{job.salary}</span>
      </div>

      {job.skills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {job.skills.slice(0, 5).map((s) => (
            <Chip key={s} variant="neon">
              {s}
            </Chip>
          ))}
          {job.skills.length > 5 && (
            <Chip variant="muted">+{job.skills.length - 5}</Chip>
          )}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 'var(--s-3)',
          borderTop: '1px solid var(--line-1)',
          fontSize: 'var(--t-sm)',
          color: 'var(--fg-2)',
        }}
      >
        <div style={{ display: 'flex', gap: 'var(--s-4)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Users size={11} />
            <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--fg-1)' }}>
              {job.resumes}
            </span>
            <span style={{ color: 'var(--fg-3)' }}>简历</span>
          </span>
          <span style={{ color: 'var(--fg-3)', fontVariantNumeric: 'tabular-nums' }}>
            面试 {job.interviewed}
          </span>
          <span style={{ color: 'var(--fg-3)', fontVariantNumeric: 'tabular-nums' }}>
            Offer {job.offer}
          </span>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            color: 'var(--fg-3)',
            fontSize: 11,
          }}
        >
          <Calendar size={11} />
          {job.createdAt}
        </span>
      </div>
    </Link>
  );
}
