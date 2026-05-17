import Link from 'next/link';
import { Send } from '@/components/icons/Icon';
import { Chip } from '@/components/ui/Chip';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { badgeVariantOfScore, verdictOfScore } from '@/lib/score-tone';

export type MatchListData = {
  job: { id: string; title: string; dept: string };
  candidates: Array<{
    id: string;
    name: string;
    score: number | null;
    yoe: number;
    current: string;
    expected: string;
    summary: string;
  }>;
};

export function Recommendation({ data }: { data: MatchListData }) {
  return (
    <div style={{ padding: 'var(--s-5)', display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
      <div>
        <div style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {data.job.id} · {data.job.dept}
        </div>
        <div style={{ fontSize: 'var(--t-lg)', fontWeight: 600, color: 'var(--fg-0)', marginTop: 4 }}>
          Top {data.candidates.length} 候选人 · {data.job.title}
        </div>
      </div>

      <div className="result-rank" style={{ padding: 0 }}>
        {data.candidates.map((c, i) => (
          <Link
            key={c.id}
            href={`/resumes/${c.id}`}
            className="result-rank-row"
            style={{ textDecoration: 'none' }}
          >
            <span className="rank-no">#{i + 1}</span>
            <ScoreRing value={c.score} size={40} stroke={4} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="rank-name">
                {c.name}
                <span className="rank-meta">
                  {' '}
                  · {c.current} · {c.yoe} 年 · 期望 {c.expected}
                </span>
              </div>
              <div className="rank-meta" style={{ marginTop: 4, color: 'var(--fg-2)' }}>
                {c.summary}
              </div>
            </div>
            {c.score !== null && (
              <Chip variant={badgeVariantOfScore(c.score)}>{verdictOfScore(c.score)}</Chip>
            )}
          </Link>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, paddingTop: 'var(--s-4)', borderTop: '1px solid var(--line-1)' }}>
        <Link className="btn btn-sm" href={`/jobs/${data.job.id}`}>
          查看职位
        </Link>
        <button type="button" className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }}>
          <Send size={12} /> 批量邀面
        </button>
      </div>
    </div>
  );
}
