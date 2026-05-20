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
const MAX_FILES_PER_BATCH = 10;

type Item =
  | { kind: 'pending'; file: File }
  | {
      kind: 'done';
      file: File;
      result: { id: string; status: '待评分' | '解析失败'; error?: string };
    };

type BrowserFileEntry = {
  isFile: boolean;
  file: (success: (file: File) => void, error?: (err: DOMException) => void) => void;
};

type BrowserDirectoryEntry = {
  isFile: boolean;
  isDirectory: boolean;
  createReader: () => {
    readEntries: (
      success: (entries: unknown[]) => void,
      error?: (err: DOMException) => void,
    ) => void;
  };
};

type WebkitDataTransferItem = DataTransferItem & {
  webkitGetAsEntry?: () => unknown;
};

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function fileNameKey(file: File): string {
  return file.name.trim().toLowerCase();
}

function isFileEntry(entry: unknown): entry is BrowserFileEntry {
  return Boolean(
    entry &&
      typeof entry === 'object' &&
      'isFile' in entry &&
      (entry as { isFile?: unknown }).isFile === true &&
      typeof (entry as { file?: unknown }).file === 'function',
  );
}

function isDirectoryEntry(entry: unknown): entry is BrowserDirectoryEntry {
  return Boolean(
    entry &&
      typeof entry === 'object' &&
      'isDirectory' in entry &&
      (entry as { isDirectory?: unknown }).isDirectory === true &&
      typeof (entry as { createReader?: unknown }).createReader === 'function',
  );
}

function fileFromEntry(entry: BrowserFileEntry): Promise<File | null> {
  return new Promise((resolve) => {
    entry.file(
      (file) => resolve(file),
      () => resolve(null),
    );
  });
}

async function filesFromEntry(entry: unknown): Promise<File[]> {
  if (isFileEntry(entry)) {
    const file = await fileFromEntry(entry);
    return file ? [file] : [];
  }
  if (!isDirectoryEntry(entry)) return [];

  const reader = entry.createReader();
  const out: File[] = [];

  while (true) {
    const entries = await new Promise<unknown[]>((resolve) => {
      reader.readEntries(resolve, () => resolve([]));
    });
    if (entries.length === 0) break;
    const nested = await Promise.all(entries.map(filesFromEntry));
    out.push(...nested.flat());
  }

  return out;
}

function snapshotDrop(dataTransfer: DataTransfer): {
  files: File[];
  dirs: BrowserDirectoryEntry[];
} {
  // DataTransfer 在事件回调返回后会被浏览器置空，必须在任何 await 之前同步快照。
  // 优先用 items 路径（能识别文件夹），否则回落到 dataTransfer.files。
  const files: File[] = [];
  const dirs: BrowserDirectoryEntry[] = [];

  if (dataTransfer.items?.length) {
    for (const raw of Array.from(dataTransfer.items)) {
      if (raw.kind !== 'file') continue;
      const item = raw as WebkitDataTransferItem;
      const entry = item.webkitGetAsEntry?.();
      if (entry && isDirectoryEntry(entry)) {
        dirs.push(entry);
        continue;
      }
      const file = item.getAsFile();
      if (file) files.push(file);
    }
  }

  // items 没拿到文件就回落到 files —— 例如某些浏览器对 items.getAsFile 返回 null。
  if (files.length === 0 && dirs.length === 0 && dataTransfer.files?.length) {
    files.push(...Array.from(dataTransfer.files));
  }

  return { files, dirs };
}

function newClientTaskId(): string {
  const t = Date.now().toString(36).slice(-7).toUpperCase();
  const r = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SCAN-${t}${r}`;
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
  const [dupError, setDupError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const selectedJob = jobs.find((j) => j.id === jobId);
  const pending = items.filter((i): i is Extract<Item, { kind: 'pending' }> => i.kind === 'pending');
  const done = items.filter((i): i is Extract<Item, { kind: 'done' }> => i.kind === 'done');
  const stats = {
    parsed: done.filter((d) => d.result.status === '待评分').length,
    failed: done.filter((d) => d.result.status === '解析失败').length,
  };

  function buildItem(f: File): Item {
    if (f.size > MAX_FILE_SIZE) {
      return { kind: 'done', file: f, result: { id: '', status: '解析失败', error: '超过 5MB' } };
    }
    if (!isAcceptedByName(f.name)) {
      return { kind: 'done', file: f, result: { id: '', status: '解析失败', error: '仅支持 .pdf / .docx' } };
    }
    return { kind: 'pending', file: f };
  }

  function addFiles(list: FileList | File[]) {
    const arr = Array.from(list);
    if (arr.length === 0) return;

    setItems((prev) => {
      const map = new Map<string, Item>();
      for (const it of prev) map.set(fileNameKey(it.file), it);

      const dupNames: string[] = [];
      for (const f of arr) {
        const key = fileNameKey(f);
        if (map.has(key)) dupNames.push(f.name);
        map.set(key, buildItem(f)); // 同名时用最后一个覆盖
      }

      setDupError(
        dupNames.length > 0
          ? `已用最新版本替换同名文件：${Array.from(new Set(dupNames)).join('、')}`
          : null,
      );

      let next = Array.from(map.values());
      if (next.length > MAX_FILES_PER_BATCH) next = next.slice(-MAX_FILES_PER_BATCH);
      return next;
    });
  }

  function removeAt(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function clearAll() {
    setItems([]);
    setDupError(null);
  }

  async function upload() {
    if (pending.length === 0 || !jobId || uploading) return;
    setUploading(true);
    const uploadingItems = pending;

    try {
      // 单请求把全部文件一起发；服务端串行解析 PDF，避免 pdfjs-dist 并发冲突
      const form = new FormData();
      for (const it of uploadingItems) form.append('files', it.file);

      type ServerItem = {
        id: string;
        fileName: string;
        status: '待评分' | '解析失败';
        error?: string;
      };
      const fallbackError = (fileName: string, error: string): ServerItem => ({
        id: '',
        fileName,
        status: '解析失败',
        error,
      });

      let results: ServerItem[];
      try {
        const res = await fetch(`/api/resumes/upload?jobId=${encodeURIComponent(jobId)}`, {
          method: 'POST',
          body: form,
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({ error: res.statusText }));
          const msg = errBody.error ?? '上传失败';
          results = uploadingItems.map((it) => fallbackError(it.file.name, msg));
        } else {
          const data = (await res.json()) as { items: ServerItem[] };
          // 按 fileName 回填，避免顺序错位
          const byName = new Map<string, ServerItem[]>();
          for (const r of data.items) {
            const arr = byName.get(r.fileName) ?? [];
            arr.push(r);
            byName.set(r.fileName, arr);
          }
          results = uploadingItems.map((it) => {
            const arr = byName.get(it.file.name);
            const r = arr?.shift();
            return r ?? fallbackError(it.file.name, '上传接口没有返回该文件的结果');
          });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results = uploadingItems.map((it) => fallbackError(it.file.name, msg));
      }

      setItems((prev) =>
        prev.map((it) => {
          if (it.kind === 'done') return it;
          const index = uploadingItems.findIndex((p) => p === it);
          const r = index >= 0 ? results[index] : undefined;
          if (!r) return it;
          return {
            kind: 'done',
            file: it.file,
            result: { id: r.id, status: r.status, error: r.error },
          };
        }),
      );

      const resumeIds = results
        .filter((item) => item.status === '待评分' && item.id)
        .map((item) => item.id);
      if (resumeIds.length > 0) {
        setCanvas({ kind: 'resume-scan', taskId: newClientTaskId(), resumeIds, jobId });
      }
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
          // DataTransfer 在任何 await 之后会被浏览器置空，必须先同步快照
          const snap = snapshotDrop(e.dataTransfer);
          void (async () => {
            const fromDirs = await Promise.all(snap.dirs.map((d) => filesFromEntry(d)));
            const all = [...snap.files, ...fromDirs.flat()];
            const seen = new Set<string>();
            const uniq = all.filter((f) => {
              const k = fileKey(f);
              if (seen.has(k)) return false;
              seen.add(k);
              return true;
            });
            if (uniq.length > 0) addFiles(uniq);
          })();
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

      {/* 同名替换提示 */}
      {dupError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 6,
            padding: '8px 10px',
            margin: '8px 0',
            borderRadius: 6,
            border: '1px solid var(--warn)',
            background: 'color-mix(in srgb, var(--warn) 12%, transparent)',
            color: 'var(--warn)',
            fontSize: 11,
            lineHeight: 1.5,
          }}
        >
          <AlertTriangle size={12} />
          <span style={{ flex: 1 }}>{dupError}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setDupError(null)}
            style={{ padding: 0, color: 'var(--warn)' }}
          >
            <X size={11} />
          </button>
        </div>
      )}

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
              <Upload size={12} /> 批量上传解析并评分 ({pending.length})
            </>
          )}
        </button>
      </div>
    </div>
  );
}
