'use client';

import * as React from 'react';
import Link from 'next/link';
import { Search, Filter, ChevronDown, Upload } from '@/components/icons/Icon';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { badgeVariantOfScore, verdictOfScore } from '@/lib/score-tone';
import type { Job, Resume } from '@/types';

export function ResumesTable({ resumes, jobs }: { resumes: Resume[]; jobs: Job[] }) {
  const [jdFilter, setJdFilter] = React.useState<string>('all');
  const [minScore, setMinScore] = React.useState<number>(0);
  const [query, setQuery] = React.useState('');

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return resumes.filter((r) => {
      if (jdFilter !== 'all' && r.appliedFor !== jdFilter) return false;
      if (r.score !== null && r.score < minScore) return false;
      if (q && !`${r.name}${r.current}${r.id}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [resumes, jdFilter, minScore, query]);

  const cleared = jdFilter !== 'all' || minScore > 0 || query.length > 0;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">简历池</div>
          <div className="page-sub">
            共 {resumes.length} 份 · 当前筛选 {filtered.length} 份
          </div>
        </div>
        <div className="page-actions">
          <Link className="btn btn-primary btn-sm" href="/chat">
            <Upload size={12} /> 批量上传简历
          </Link>
        </div>
      </div>

      <div className="filter-row">
        <div className="filter-select">
          <Filter size={12} />
          <select
            className="select-bare"
            value={jdFilter}
            onChange={(e) => setJdFilter(e.target.value)}
            aria-label="按职位筛选"
          >
            <option value="all">全部职位</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.id} · {j.title}
              </option>
            ))}
          </select>
          <ChevronDown size={12} />
        </div>

        <div
          className="filter-select"
          style={{ gap: 'var(--s-3)', paddingRight: 14 }}
        >
          <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>评分 ≥</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            style={{ width: 120, accentColor: 'var(--neon-1)' }}
            aria-label="评分阈值"
          />
          <span
            style={{
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--fg-0)',
              fontWeight: 600,
              minWidth: 22,
              textAlign: 'right',
            }}
          >
            {minScore}
          </span>
        </div>

        <div className="filter-spacer" />
        <div className="search">
          <Search size={13} />
          <input
            className="search-input"
            placeholder="搜索姓名 / 当前公司 / 简历 ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={cleared ? '没找到匹配的简历' : '简历池是空的'}
          hint={
            cleared
              ? '试试放宽评分阈值或更换 JD。'
              : '上传简历后会在这里看到 AI 评分结果。'
          }
          cta={
            cleared
              ? {
                  label: '清空筛选',
                  onClick: () => {
                    setJdFilter('all');
                    setMinScore(0);
                    setQuery('');
                  },
                }
              : { label: '上传简历', href: '/chat' }
          }
        />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 76 }}>评分</th>
                <th>候选人</th>
                <th>投递 JD</th>
                <th>当前公司</th>
                <th>年限</th>
                <th>期望薪资</th>
                <th style={{ textAlign: 'right' }}>投递时间</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const job = jobs.find((j) => j.id === r.appliedFor);
                return (
                  <tr key={r.id} className="is-clickable">
                    <td>
                      <ScoreRing value={r.score} size={40} stroke={4} />
                    </td>
                    <td>
                      <Link
                        href={`/resumes/${r.id}`}
                        style={{
                          display: 'block',
                          color: 'var(--fg-0)',
                          fontWeight: 500,
                          textDecoration: 'none',
                        }}
                      >
                        {r.name}
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--fg-3)',
                            marginTop: 2,
                            fontWeight: 400,
                          }}
                        >
                          {r.id} · {r.location}
                          {r.score !== null && (
                            <>
                              {' · '}
                              <Chip variant={badgeVariantOfScore(r.score)}>
                                {verdictOfScore(r.score)}
                              </Chip>
                            </>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td>
                      {job ? (
                        <Link
                          href={`/jobs/${job.id}`}
                          style={{
                            color: 'var(--fg-1)',
                            textDecoration: 'none',
                          }}
                        >
                          {job.title}
                          <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{job.id}</div>
                        </Link>
                      ) : (
                        <span style={{ color: 'var(--fg-3)' }}>{r.appliedFor}</span>
                      )}
                    </td>
                    <td>
                      <span style={{ color: 'var(--fg-1)' }}>{r.current}</span>
                    </td>
                    <td>
                      <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--fg-1)' }}>
                        {r.yoe} 年
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--fg-1)' }}>{r.expected}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{r.appliedAt}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
