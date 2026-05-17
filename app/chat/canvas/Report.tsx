import { Sparkle, AlertTriangle, Check } from '@/components/icons/Icon';
import { Markdown } from './Markdown';

export type PipelineReportData = {
  scope: 'all' | 'active';
  jobCount: number;
  funnel: { resumes: number; interviewed: number; offer: number };
  insights: Array<{ tone: 'ok' | 'warn' | 'info'; text: string }>;
  jobs: Array<{
    id: string;
    title: string;
    resumes: number;
    interviewed: number;
    offer: number;
    status: string;
  }>;
};

const TONE_ICON = {
  ok: { Icon: Check, color: 'var(--ok)', bg: 'var(--ok-bg)' },
  warn: { Icon: AlertTriangle, color: 'var(--warn)', bg: 'var(--warn-bg)' },
  info: { Icon: Sparkle, color: 'var(--neon-1)', bg: 'rgba(167,139,250,0.10)' },
} as const;

export function Report({ data }: { data: PipelineReportData }) {
  const max = Math.max(data.funnel.resumes, 1);
  return (
    <div style={{ padding: 'var(--s-5)', display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
      <div>
        <div style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {data.scope === 'active' ? '在招职位' : '全部职位'} · {data.jobCount} 个
        </div>
        <div style={{ fontSize: 'var(--t-lg)', fontWeight: 600, color: 'var(--fg-0)', marginTop: 4 }}>
          招聘漏斗
        </div>
      </div>

      <div className="funnel">
        {(
          [
            { label: '简历池', count: data.funnel.resumes, color: 'var(--neon-1)' },
            { label: '面试中', count: data.funnel.interviewed, color: 'var(--neon-2)' },
            { label: 'Offer', count: data.funnel.offer, color: 'var(--ok)' },
          ] as const
        ).map((row) => (
          <div key={row.label} className="funnel-row">
            <div className="funnel-label">{row.label}</div>
            <div className="funnel-track">
              <div
                className="funnel-fill"
                style={{ width: `${Math.max((row.count / max) * 100, 6)}%`, background: row.color, borderColor: row.color }}
              >
                {row.count}
              </div>
            </div>
          </div>
        ))}
      </div>

      {data.insights.length > 0 && (
        <div className="insights">
          {data.insights.map((ins, i) => {
            const { Icon, color, bg } = TONE_ICON[ins.tone];
            return (
              <div key={i} className="insight">
                <span className="insight-tag" style={{ background: bg, color }}>
                  <Icon size={10} />
                </span>
                <span className="insight-text">
                  <Markdown source={ins.text} />
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
