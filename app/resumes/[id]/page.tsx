import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  X,
  Sparkle,
  Mail,
  Phone,
  Map,
  GraduationCap,
  Building,
  Calendar,
} from '@/components/icons/Icon';
import { ResumeActions } from './ResumeActions.client';
import { BarScore } from '@/components/ui/BarScore';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { prisma } from '@/lib/db';
import { compactList, truncateText } from '@/lib/display';
import { toJobDTO, toResumeDTO } from '@/lib/dto';
import { verdictOfScore } from '@/lib/score-tone';

export const dynamic = 'force-dynamic';

export default async function ResumeDetailPage({ params }: { params: { id: string } }) {
  const row = await prisma.resume.findUnique({
    where: { id: params.id },
    include: { appliedFor: true },
  });
  if (!row) notFound();

  const resume = toResumeDTO(row);
  const job = toJobDTO(row.appliedFor);
  const fullName = resume.name?.trim() || `候选人 ${resume.id}`;
  const displayName = truncateText(fullName, 8);
  const displaySummary = truncateText(resume.summary, 60, '暂无 AI 摘要');
  const skillView = compactList(resume.skills, 8);

  return (
    <div className="page">
      <div className="page-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link className="btn btn-ghost btn-sm" href="/resumes">
            <ArrowLeft size={13} />
          </Link>
          <div>
            <div className="page-crumb">
              简历池 / {resume.id} · 投递 {job.id}
            </div>
            <div className="page-title" title={fullName}>{displayName}</div>
          </div>
        </div>
        <div className="page-actions">
          <Link
            className="btn btn-sm"
            href={`/chat?resumeId=${encodeURIComponent(resume.id)}&intent=suggest_questions`}
          >
            <Sparkle size={12} /> 在对话中讨论
          </Link>
          <ResumeActions
            resumeId={resume.id}
            name={fullName}
            status={resume.status}
            canRescore={Boolean(row.parsedText?.trim())}
          />
        </div>
      </div>

      {/* 顶部 ScoreRing + 基本信息 */}
      <Card pad style={{ marginBottom: 'var(--s-5)' }}>
        <div className="resume-head">
          <ScoreRing value={resume.score} size={76} stroke={6} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className="resume-name" title={fullName}>{displayName}</span>
              {resume.score !== null && <Chip variant="neon">{verdictOfScore(resume.score)}</Chip>}
            </div>
            <div className="resume-contact" style={{ marginTop: 6 }}>
              <span>
                <Building size={11} /> {resume.current ?? '当前公司待识别'}
              </span>
              <span>
                <GraduationCap size={11} /> {resume.edu ?? '教育经历待识别'}
              </span>
              <span>
                <Map size={11} /> {resume.location ?? '地点待识别'} · 期望 {resume.expected ?? '待识别'} ·{' '}
                {resume.yoe == null ? '年限待识别' : `${resume.yoe} 年经验`}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="resume-grid">
        {/* 左 2/3: AI 摘要 + 优势/风险 + 面试问题 + 工作经历 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
          <Card pad className="ai-score-card">
            <SectionTitle>AI 综合摘要</SectionTitle>
            <div className="ai-summary">
              <Sparkle size={14} style={{ color: 'var(--neon-1)', flex: 'none', marginTop: 2 }} />
              <span title={resume.summary ?? undefined}>{displaySummary}</span>
            </div>

            {(resume.pros.length > 0 || resume.cons.length > 0) && (
              <div className="pros-cons" style={{ marginTop: 'var(--s-4)' }}>
                {resume.pros.length > 0 && (
                  <div className="pros">
                    <div className="pc-head">
                      <Check size={11} style={{ color: 'var(--ok)' }} /> 优势
                    </div>
                    <ul>
                      {resume.pros.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {resume.cons.length > 0 && (
                  <div className="cons">
                    <div className="pc-head">
                      <X size={11} style={{ color: 'var(--warn)' }} /> 需关注
                    </div>
                    <ul>
                      {resume.cons.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Card>

          {resume.interview.length > 0 && (
            <Card pad>
              <SectionTitle hint="Rui 建议面试时验证">建议面试问题</SectionTitle>
              <ol className="interview-list">
                {resume.interview.map((q, i) => (
                  <li key={q}>
                    <span className="interview-no">{i + 1}</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          {resume.workHistory && resume.workHistory.length > 0 && (
            <Card pad>
              <SectionTitle>工作经历</SectionTitle>
              <div className="timeline">
                {resume.workHistory.map((w) => (
                  <div key={w.co} className="timeline-row">
                    <span className="timeline-dot" />
                    <div style={{ flex: 1 }}>
                      <div className="timeline-co">{w.co}</div>
                      <div className="timeline-title">
                        {w.title} · {w.dur}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* 右 1/3: 5 项 BarScore + 技能 + 元信息 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
          <Card pad>
            <SectionTitle>评分拆解</SectionTitle>
            {resume.breakdown ? (
              <div className="breakdown">
                <BarScore value={resume.breakdown.skill} label="技能匹配" />
                <BarScore value={resume.breakdown.experience} label="经验深度" />
                <BarScore value={resume.breakdown.education} label="教育背景" />
                <BarScore value={resume.breakdown.project} label="项目复杂度" />
                <BarScore value={resume.breakdown.stability} label="稳定性" />
              </div>
            ) : (
              <div className="empty" style={{ padding: 24 }}>
                待评分
              </div>
            )}
          </Card>

          {resume.skills.length > 0 && (
            <Card pad>
              <SectionTitle>技能标签</SectionTitle>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {skillView.visible.map((s) => (
                  <Chip key={s} variant="cyan">
                    {s}
                  </Chip>
                ))}
                {skillView.hidden > 0 && <Chip variant="muted">+{skillView.hidden}</Chip>}
              </div>
            </Card>
          )}

          <Card pad>
            <SectionTitle>投递信息</SectionTitle>
            <div className="resume-contact">
              <span>
                <Building size={11} /> 投递岗位：
                <Link href={`/jobs/${job.id}`} style={{ color: 'var(--neon-1)' }}>
                  {job.title}
                </Link>
              </span>
              <span>
                <Calendar size={11} /> 投递时间：{resume.appliedAt}
              </span>
              <span>
                <Mail size={11} /> 联系方式：（脱敏，邀面后释放）
              </span>
              <span>
                <Phone size={11} /> 手机号：（脱敏，邀面后释放）
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
