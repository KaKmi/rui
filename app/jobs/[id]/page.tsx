import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  PenLine,
  Copy,
  Pause,
  Send,
  Chevron,
} from '@/components/icons/Icon';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { KV } from '@/components/ui/KV';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { prisma } from '@/lib/db';
import { formatJobLabel } from '@/lib/display';
import { toJobDTO, toResumeDTO } from '@/lib/dto';
import { badgeVariantOfScore, verdictOfScore } from '@/lib/score-tone';
import type { JobStatus } from '@/types';

export const dynamic = 'force-dynamic';

const STATUS_VARIANT: Record<JobStatus, Parameters<typeof Badge>[0]['variant']> = {
  招聘中: 'ok',
  已暂停: 'warn',
  草稿: 'muted',
  已关闭: 'bad',
};

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const row = await prisma.job.findUnique({
    where: { id: params.id },
    include: {
      resumeList: {
        orderBy: { score: 'desc' },
        take: 5,
      },
    },
  });
  if (!row) notFound();
  const job = toJobDTO(row);
  const top5 = row.resumeList.map(toResumeDTO);
  const candidateCount = await prisma.resume.count({ where: { appliedForId: job.id } });

  return (
    <div className="page">
      <div className="page-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link className="btn btn-ghost btn-sm" href="/jobs">
            <ArrowLeft size={13} />
          </Link>
          <div>
            <div className="page-crumb">职位管理 / {formatJobLabel(job, { maxTitle: 12 })}</div>
            <div className="page-title">{job.title}</div>
          </div>
          <Badge variant={STATUS_VARIANT[job.status]}>{job.status}</Badge>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-sm">
            <PenLine size={12} /> 编辑
          </button>
          <button type="button" className="btn btn-sm">
            <Copy size={12} /> 复制 JD
          </button>
          <button type="button" className="btn btn-sm">
            <Pause size={12} /> 暂停
          </button>
          <Link className="btn btn-primary btn-sm" href="/chat">
            <Send size={12} /> 在对话中改 JD
          </Link>
        </div>
      </div>

      <div className="detail-grid">
        {/* 左 2/3 : JD 全文 */}
        <Card pad>
          <SectionTitle hint={`创建于 ${job.createdAt}`}>JD 详情</SectionTitle>

          <div className="kv-grid">
            <KV k="部门" v={job.dept} />
            <KV k="职级" v={job.level} />
            <KV k="工作地" v={job.location} />
            <KV k="薪资" v={job.salary} />
            <KV k="类型" v={job.type} />
            <KV k="HC" v={job.headcount} />
            <KV k="用人经理" v={job.owner} />
            <KV k="HR" v={job.hr} />
          </div>

          <div style={{ height: 'var(--s-5)' }} />
          <SectionTitle>技能标签</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {job.skills.map((s) => (
              <Chip key={s} variant="neon">
                {s}
              </Chip>
            ))}
          </div>

          {job.description && (
            <>
              <div style={{ height: 'var(--s-5)' }} />
              <SectionTitle>岗位介绍</SectionTitle>
              <div className="prose">{job.description}</div>
            </>
          )}

          {job.responsibilities && job.responsibilities.length > 0 && (
            <>
              <div style={{ height: 'var(--s-5)' }} />
              <SectionTitle>工作职责</SectionTitle>
              <ul className="prose-list">
                {job.responsibilities.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </>
          )}

          {job.requirements && job.requirements.length > 0 && (
            <>
              <div style={{ height: 'var(--s-5)' }} />
              <SectionTitle>任职要求</SectionTitle>
              <ul className="prose-list">
                {job.requirements.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </>
          )}

          {job.nice && job.nice.length > 0 && (
            <>
              <div style={{ height: 'var(--s-5)' }} />
              <SectionTitle>加分项</SectionTitle>
              <ul className="prose-list">
                {job.nice.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </>
          )}
        </Card>

        {/* 右 1/3 : 漏斗 + Top 候选人 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
          <Card pad>
            <SectionTitle>招聘漏斗</SectionTitle>
            <div className="kpi-row">
              <KPI v={job.resumes} l="简历池" color="var(--neon-1)" />
              <KPI v={job.interviewed} l="面试中" color="var(--neon-2)" />
              <KPI v={job.offer} l="Offer" color="var(--ok)" />
            </div>
          </Card>

          <Card pad>
            <SectionTitle
              hint={`共 ${candidateCount} 份`}
              action={
                <Link className="btn btn-ghost btn-sm" href="/resumes">
                  查看全部 <Chevron size={11} />
                </Link>
              }
            >
              Top 候选人
            </SectionTitle>
            {top5.length === 0 ? (
              <div className="empty" style={{ padding: 30 }}>
                暂无简历。点击「批量上传简历」开始。
              </div>
            ) : (
              <div className="rank-list">
                {top5.map((r) => (
                  <Link
                    key={r.id}
                    href={`/resumes/${r.id}`}
                    className="rank-row"
                    style={{ textDecoration: 'none' }}
                  >
                    <ScoreRing value={r.score} size={36} stroke={4} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="rank-row-name">{r.name}</div>
                      <div className="rank-row-meta">
                        {r.current} · {r.yoe} 年
                      </div>
                    </div>
                    {r.score !== null && (
                      <Chip variant={badgeVariantOfScore(r.score)}>
                        {verdictOfScore(r.score)}
                      </Chip>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function KPI({ v, l, color }: { v: number; l: string; color: string }) {
  return (
    <div className="kpi">
      <div className="kpi-v" style={{ color }}>
        {v}
      </div>
      <div className="kpi-l">{l}</div>
    </div>
  );
}
