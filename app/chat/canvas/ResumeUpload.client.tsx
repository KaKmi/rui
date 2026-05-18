'use client';

import * as React from 'react';
import {
  Upload,
  File as FileIcon,
  X,
  Check,
  AlertTriangle,
  Briefcase,
  ChevronDown,
} from '@/components/icons/Icon';
import { Chip } from '@/components/ui/Chip';
import type { Job } from '@/types';
import { useCanvas } from '@/lib/store/canvas';
import { ACCEPT_ATTR, isAcceptedByName } from '@/lib/parsers/accept';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 与服务端 route 对齐

type Item =
  | { kind: 'pending'; file: File }
  | {
      kind: 'done';
      file: File;
      result: { id: string; status: '待评分' | '解析失败'; error?: string };
    };

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function ResumeUpload({ jobs }: { jobs: Job[] }) {
  const initJobId = useCanvas((s) =>
    s.state.kind === 'resume-upload' ? s.state.jobId ?? null : null,
  );
  const closeCanvas = useCanvas((s) => s.reset);
  const setCanvas = useCanvas((s) => s.set);

  // 默认选第一个"招聘中"的 job；用户可改
  const activeJobs = React.useMemo(() => jobs.filter((j) => j.status === '招聘中'), [jobs]);
  const [jobId, setJobId] = React.useState<string>(initJobId ?? activeJobs[0]?.id ?? jobs[0]?.id ?? '');
  const [items, setItems] = React.useState<Item[]>([]);
  const [isOver, setIsOver] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const selectedJob = jobs.find((j) => j.id === jobId);
  const pending = items.filter((i): i is Extract<Item, { kind: 'pending' }> => i.kind === 'pending');
  const done = items.filter((i): i is Extract<Item, { kind: 'done' }> => i.kind === 'done');
  const stats = {
    parsed: done.filter((d) => d.result.status === '待评分').length,
    failed: done.filter((d) => d.result.status === '解析失败').length,
  };

  function addFiles(list: FileList | File[]) {
    const arr = Array.from(list);
    const valid: Item[] = [];
    for (const f of arr) {
      if (f.size > MAX_FILE_SIZE) {
        valid.push({
          kind: 'done',
          file: f,
          result: { id: '', status: '解析失败', error: '超过 5MB' },
        });
        continue;
      }
      if (!isAcceptedByName(f.name)) {
        valid.push({
          kind: 'done',
          file: f,
          result: { id: '', status: '解析失败', error: '仅支持 .pdf / .docx' },
        });
        continue;
      }
      valid.push({ kind: 'pending', file: f });
    }
    setItems((prev) => [...prev, ...valid]);
  }

  function removeAt(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function clearAll() {
    setItems([]);
  }

  async function upload() {
    if (pending.length === 0 || !jobId || uploading) return;
    setUploading(true);
    const form = new FormData();
    for (const p of pending) form.append('files', p.file);

    try {
      const res = await fetch(`/api/resumes/upload?jobId=${encodeURIComponent(jobId)}`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: res.statusText }));
        // 整批失败：把所有 pending 标记失败
        setItems((prev) =>
          prev.map((it) =>
            it.kind === 'pending'
              ? {
                  kind: 'done',
                  file: it.file,
                  result: { id: '', status: '解析失败', error: errBody.error ?? '上传失败' },
                }
              : it,
          ),
        );
        return;
      }
      const data = (await res.json()) as {
        taskId: string;
        items: Array<{ id: string; fileName: string; status: '待评分' | '解析失败'; error?: string }>;
      };
      // 按文件名回填（顺序应一致，但 fileName 兜底）
      setItems((prev) => {
        const byName = new Map(data.items.map((d) => [d.fileName, d]));
        return prev.map((it) => {
          if (it.kind === 'done') return it;
          const r = byName.get(it.file.name);
          if (!r) return it;
          return {
            kind: 'done',
            file: it.file,
            result: { id: r.id, status: r.status, error: r.error },
          };
        });
      });
      const resumeIds = data.items
        .filter((item) => item.status === '待评分' && item.id)
        .map((item) => item.id);
      if (resumeIds.length > 0) {
        setCanvas({ kind: 'resume-scan', taskId: data.taskId, resumeIds, jobId });
      }
    } catch (e) {
      setItems((prev) =>
        prev.map((it) =>
          it.kind === 'pending'
            ? {
                kind: 'done',
                file: it.file,
                result: {
                  id: '',
                  status: '解析失败',
                  error: e instanceof Error ? e.message : String(e),
                },
              }
            : it,
        ),
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="resume-upload">
      {/* 关联职位 */}
      <div className="resume-target">
        <div className="resume-target-label">
          <Briefcase size={11} /> 关联职位
        </div>
        <div className="resume-target-job">
          <div style={{ flex: 1, minWidth: 0 }}>
            {selectedJob ? (
              <>
                <div className="resume-target-title">{selectedJob.title}</div>
                <div className="resume-target-id">
                  {selectedJob.id} · {selectedJob.dept}
                </div>
              </>
            ) : (
              <div className="resume-target-id">未选择职位</div>
            )}
          </div>
          <div className="filter-select" style={{ minWidth: 180 }}>
            <select
              className="select-bare"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              disabled={uploading}
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.id} · {j.title}
                </option>
              ))}
            </select>
            <ChevronDown size={12} />
          </div>
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={`drop-zone${isOver ? ' is-over' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsOver(true);
        }}
        onDragLeave={() => setIsOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsOver(false);
          if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
        }}
        role="button"
        tabIndex={0}
      >
        <div className="drop-zone-mark">
          <Upload size={20} />
        </div>
        <div className="drop-zone-text">
          <strong>拖拽简历到此</strong> 或点击选文件
        </div>
        <div className="drop-zone-sub">支持 .pdf / .docx · 单文件 ≤ 5MB · 单次最多 10 份</div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTR}
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {/* 文件列表 */}
      {items.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              文件 · {items.length} 个
            </span>
            {done.length > 0 && (
              <>
                {stats.parsed > 0 && <Chip variant="ok">{stats.parsed} 已解析</Chip>}
                {stats.failed > 0 && <Chip variant="bad">{stats.failed} 失败</Chip>}
              </>
            )}
            <div style={{ flex: 1 }} />
            {!uploading && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearAll}>
                清空
              </button>
            )}
          </div>
          <div className="file-list">
            {items.map((it, i) => (
              <div className="file-row" key={`${it.file.name}-${i}`}>
                <div className="file-icon">
                  <FileIcon size={12} />
                </div>
                <div className="file-name" style={{ minWidth: 0 }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {it.file.name}
                  </div>
                  {it.kind === 'done' && it.result.status === '解析失败' && (
                    <div style={{ fontSize: 10, color: 'var(--bad)', marginTop: 2 }}>
                      <AlertTriangle size={10} /> {it.result.error}
                    </div>
                  )}
                  {it.kind === 'done' && it.result.status === '待评分' && (
                    <div style={{ fontSize: 10, color: 'var(--ok)', marginTop: 2 }}>
                      <Check size={10} /> 已解析 · {it.result.id}
                    </div>
                  )}
                </div>
                <div className="file-size">{fmtSize(it.file.size)}</div>
                {!uploading && it.kind === 'pending' && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeAt(i)}>
                    <X size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* 底栏 */}
      <div className="resume-upload-foot">
        <button type="button" className="btn btn-sm" onClick={closeCanvas}>
          <X size={12} /> 关闭
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={upload}
          disabled={uploading || pending.length === 0 || !jobId}
        >
          {uploading ? (
            <>
              <span className="spin-mini" /> 上传中…
            </>
          ) : (
            <>
              <Upload size={12} /> 上传并解析 ({pending.length})
            </>
          )}
        </button>
      </div>
    </div>
  );
}
