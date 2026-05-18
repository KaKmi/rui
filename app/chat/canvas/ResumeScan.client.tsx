'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle, Check, Refresh, Sparkle, Upload } from '@/components/icons/Icon';
import { Chip } from '@/components/ui/Chip';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { useCanvas } from '@/lib/store/canvas';
import { badgeVariantOfScore, verdictOfScore } from '@/lib/score-tone';

export type ResumeScanResult = {
  id: string;
  jobId: string;
  fileName: string | null;
  name: string;
  score: number;
  summary: string;
  current: string | null;
  expected: string | null;
  location: string | null;
  yoe: number | null;
  status: 'AI 已评分';
};

export type ResumeResultsData = {
  taskId: string;
  jobId?: string;
  total: number;
  ok: number;
  failed: number;
  results: ResumeScanResult[];
};

type StepKey = 'load' | 'redact' | 'llm' | 'save' | 'done';

type ScanEvent =
  | { type: 'start'; taskId: string; total: number }
  | { type: 'resume-start'; taskId: string; id: string; index: number; total: number }
  | { type: 'step'; taskId: string; id: string; step: StepKey; label: string }
  | { type: 'resume-done'; taskId: string; result: ResumeScanResult }
  | { type: 'resume-error'; taskId: string; id: string; error: string }
  | ResumeResultsEvent;

type ResumeResultsEvent = ResumeResultsData & { type: 'done' };

const STEP_ORDER: StepKey[] = ['load', 'redact', 'llm', 'save', 'done'];
const STEP_LABEL: Record<StepKey, string> = {
  load: '读取简历记录',
  redact: '脱敏简历正文',
  llm: '调用 MiMo 评分',
  save: '写回评分结果',
  done: '完成',
};

function isScanEvent(value: unknown): value is ScanEvent {
  return Boolean(value && typeof value === 'object' && 'type' in value);
}

function resultDataFromEvent(event: ResumeResultsEvent, jobId?: string): ResumeResultsData {
  return {
    taskId: event.taskId,
    jobId,
    total: event.total,
    ok: event.ok,
    failed: event.failed,
    results: event.results,
  };
}

export function ResumeScan({
  taskId,
  resumeIds,
  jobId,
}: {
  taskId: string;
  resumeIds: string[];
  jobId?: string;
}) {
  const setCanvas = useCanvas((s) => s.set);
  const idsKey = resumeIds.join(',');
  const [total, setTotal] = React.useState(resumeIds.length);
  const [current, setCurrent] = React.useState<{ id: string; index: number } | null>(null);
  const [currentStep, setCurrentStep] = React.useState<StepKey | null>(null);
  const [results, setResults] = React.useState<ResumeScanResult[]>([]);
  const [errors, setErrors] = React.useState<Array<{ id: string; error: string }>>([]);
  const [fatal, setFatal] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (resumeIds.length === 0) {
      setFatal('本批次没有可评分的简历。');
      return;
    }

    const url = `/api/resumes/scan/${encodeURIComponent(taskId)}?resumeIds=${resumeIds
      .map(encodeURIComponent)
      .join(',')}`;
    const source = new EventSource(url);

    source.onmessage = (event) => {
      try {
        const parsed: unknown = JSON.parse(event.data);
        if (!isScanEvent(parsed)) return;

        if (parsed.type === 'start') {
          setTotal(parsed.total);
          return;
        }
        if (parsed.type === 'resume-start') {
          setCurrent({ id: parsed.id, index: parsed.index });
          setCurrentStep(null);
          return;
        }
        if (parsed.type === 'step') {
          setCurrentStep(parsed.step);
          return;
        }
        if (parsed.type === 'resume-done') {
          setResults((prev) => [...prev.filter((r) => r.id !== parsed.result.id), parsed.result]);
          setCurrentStep('done');
          return;
        }
        if (parsed.type === 'resume-error') {
          setErrors((prev) => [...prev.filter((e) => e.id !== parsed.id), { id: parsed.id, error: parsed.error }]);
          return;
        }
        if (parsed.type === 'done') {
          const data = resultDataFromEvent(parsed, jobId);
          source.close();
          window.setTimeout(() => setCanvas({ kind: 'resume-results', data }), 450);
        }
      } catch (e) {
        setFatal(e instanceof Error ? e.message : String(e));
      }
    };

    source.onerror = () => {
      setFatal('评分进度连接中断，请稍后重试。');
      source.close();
    };

    return () => source.close();
  }, [idsKey, jobId, resumeIds, setCanvas, taskId]);

  const doneCount = results.length + errors.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const currentStepIndex = currentStep ? STEP_ORDER.indexOf(currentStep) : -1;

  return (
    <div className="scan-view">
      <div className="scan-summary">
        <div>
          <div className="scan-num">
            {doneCount}/{total}
          </div>
          <div className="scan-meta">
            {fatal ? '评分已中断' : '正在脱敏、评分并写回简历池'}
          </div>
        </div>
        <div className="scan-progress">
          <div className="scan-progress-bar">
            <div className="scan-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="scan-progress-num">{pct}%</div>
        </div>
      </div>

      <div className="resume-target">
        <div className="scan-current-head">
          <div>
            <div className="scan-current-label">Current Resume</div>
            <div className="scan-current-name">
              {current ? `${current.id} · 第 ${current.index} 份` : '等待开始'}
            </div>
          </div>
          <div className="scan-current-spin">
            {fatal ? <AlertTriangle size={13} /> : <Sparkle size={13} />}
          </div>
        </div>

        <div className="scan-steps">
          {STEP_ORDER.map((step, idx) => {
            const state = idx < currentStepIndex ? 'done' : idx === currentStepIndex ? 'doing' : '';
            return (
              <div key={step} className={`scan-step ${state}`}>
                <span className="scan-step-dot">{state === 'done' ? <Check size={8} /> : null}</span>
                <span>{STEP_LABEL[step]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {fatal && (
        <div className="msg-hint" style={{ borderColor: 'rgba(248,113,113,0.45)' }}>
          <AlertTriangle size={12} /> {fatal}
        </div>
      )}

      {(results.length > 0 || errors.length > 0) && (
        <div className="scan-result-list">
          {results.map((r) => (
            <div className="scan-result-row" key={r.id}>
              <ScoreRing value={r.score} size={36} stroke={4} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="scan-result-name">{r.name}</div>
                <div className="scan-result-meta">
                  {r.id} · {verdictOfScore(r.score)}
                </div>
              </div>
              <Chip variant={badgeVariantOfScore(r.score)}>{r.score}</Chip>
            </div>
          ))}
          {errors.map((e) => (
            <div className="scan-result-row" key={e.id}>
              <AlertTriangle size={16} style={{ color: 'var(--bad)', flex: 'none' }} />
              <div style={{ minWidth: 0 }}>
                <div className="scan-result-name">{e.id}</div>
                <div className="scan-result-meta">{e.error}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ResumeResults({ data }: { data: ResumeResultsData }) {
  const setCanvas = useCanvas((s) => s.set);
  const sorted = React.useMemo(
    () => [...data.results].sort((a, b) => b.score - a.score),
    [data.results],
  );

  return (
    <div>
      <div className="results-summary">
        <div className="results-summary-cell">
          <div className="results-summary-num">{data.total}</div>
          <div className="results-summary-label">本批总数</div>
        </div>
        <div className="results-summary-cell">
          <div className="results-summary-num">{data.ok}</div>
          <div className="results-summary-label">已评分</div>
        </div>
        <div className="results-summary-cell">
          <div className="results-summary-num">{data.failed}</div>
          <div className="results-summary-label">失败</div>
        </div>
      </div>

      <div className="result-rank" style={{ marginTop: 'var(--s-5)' }}>
        {sorted.map((r, idx) => (
          <Link className="result-rank-row" href={`/resumes/${r.id}`} key={r.id}>
            <div className="rank-no">{idx + 1}</div>
            <ScoreRing value={r.score} size={42} stroke={4} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="rank-name">{r.name}</div>
              <div className="rank-meta">
                {r.id} · {r.current ?? '当前公司待识别'} · {r.yoe == null ? '年限待识别' : `${r.yoe} 年`}
              </div>
              <div className="rank-tags">
                <span className="rank-tag">{verdictOfScore(r.score)}</span>
                {r.location && <span className="rank-tag">{r.location}</span>}
                {r.expected && <span className="rank-tag">{r.expected}</span>}
              </div>
            </div>
          </Link>
        ))}

        {sorted.length === 0 && (
          <div className="empty" style={{ padding: 32 }}>
            本批没有成功评分的简历。
          </div>
        )}
      </div>

      <div className="results-footer">
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => setCanvas({ kind: 'resume-upload', jobId: data.jobId })}
        >
          <Upload size={12} /> 继续上传
        </button>
        <Link className="btn btn-primary btn-sm" href="/resumes">
          <Refresh size={12} /> 查看简历池
        </Link>
      </div>
    </div>
  );
}
