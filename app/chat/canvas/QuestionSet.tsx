import Link from 'next/link';
import { Check, HelpCircle, Sparkle } from '@/components/icons/Icon';
import { Chip } from '@/components/ui/Chip';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { badgeVariantOfScore, verdictOfScore } from '@/lib/score-tone';

export type QuestionSetData = {
  kind: 'question-set';
  resume: {
    id: string;
    name: string;
    score: number | null;
    summary: string;
  };
  job: {
    id: string;
    title: string;
    dept: string;
  };
  overview: string;
  questions: Array<{
    area: string;
    question: string;
    why: string;
    signals: string[];
  }>;
};

export function QuestionSet({ data }: { data: QuestionSetData }) {
  return (
    <div className="question-set">
      <div className="question-set-head">
        <ScoreRing value={data.resume.score} size={48} stroke={4} />
        <div style={{ minWidth: 0 }}>
          <div className="question-set-kicker">
            {data.job.id} · {data.job.dept}
          </div>
          <div className="question-set-title">{data.resume.name}</div>
          <div className="question-set-meta">
            {data.job.title}
            {data.resume.score !== null && (
              <>
                {' · '}
                <Chip variant={badgeVariantOfScore(data.resume.score)}>
                  {verdictOfScore(data.resume.score)}
                </Chip>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="question-overview">
        <Sparkle size={13} />
        <span>{data.overview}</span>
      </div>

      <div className="question-list">
        {data.questions.map((q, idx) => (
          <div className="question-card" key={`${q.area}-${idx}`}>
            <div className="question-card-head">
              <span className="question-no">{idx + 1}</span>
              <span className="question-area">{q.area}</span>
            </div>
            <div className="question-text">
              <HelpCircle size={13} />
              <span>{q.question}</span>
            </div>
            <div className="question-why">{q.why}</div>
            {q.signals.length > 0 && (
              <div className="question-signals">
                {q.signals.map((s) => (
                  <span key={s}>
                    <Check size={10} />
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="question-foot">
        <Link className="btn btn-sm" href={`/resumes/${data.resume.id}`}>
          查看简历详情
        </Link>
        <Link className="btn btn-primary btn-sm" href={`/jobs/${data.job.id}`}>
          查看岗位
        </Link>
      </div>
    </div>
  );
}
