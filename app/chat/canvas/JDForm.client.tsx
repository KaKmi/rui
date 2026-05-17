'use client';

import * as React from 'react';
import { X, Send, Plus } from '@/components/icons/Icon';
import { Chip } from '@/components/ui/Chip';
import { useCanvas, type JDFormDefaults } from '@/lib/store/canvas';

/**
 * spec §6.6.1 jd-form 画布：8 字段表单 + 技能 chip 输入 + 补充要求
 * 提交时把表单内容拼成自然语言用户消息丢给 ChatStream，
 * 通过 props.onSubmit 传出（避免在 form 里直接耦合 useChat）。
 */
export function JDForm({ onSubmit }: { onSubmit: (text: string) => void }) {
  const defaults = useCanvas((s) => (s.state.kind === 'jd-form' ? s.state.defaults : undefined));
  const closeCanvas = useCanvas((s) => s.reset);

  const [form, setForm] = React.useState<Required<Pick<JDFormDefaults, 'title' | 'dept' | 'level' | 'location' | 'salary'>> & {
    headcount: number;
    mustHave: string[];
    niceToHave: string[];
    extra: string;
  }>(() => ({
    title: defaults?.title ?? '',
    dept: defaults?.dept ?? '',
    level: defaults?.level ?? '',
    location: defaults?.location ?? '',
    salary: defaults?.salary ?? '',
    headcount: defaults?.headcount ?? 1,
    mustHave: defaults?.mustHave ?? [],
    niceToHave: defaults?.niceToHave ?? [],
    extra: defaults?.extra ?? '',
  }));

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const canSubmit =
    form.title.trim() &&
    form.dept.trim() &&
    form.level.trim() &&
    form.location.trim() &&
    form.salary.trim() &&
    form.headcount > 0 &&
    form.mustHave.length > 0;

  function submit() {
    if (!canSubmit) return;
    const text = [
      `请帮我用 generate_jd 工具生成一份 JD，输入如下：`,
      `- 岗位：${form.title}`,
      `- 部门：${form.dept}`,
      `- 职级：${form.level}`,
      `- 工作地：${form.location}`,
      `- 薪资：${form.salary}`,
      `- 人数：${form.headcount}`,
      `- 必备：${form.mustHave.join('、')}`,
      form.niceToHave.length ? `- 加分：${form.niceToHave.join('、')}` : null,
      form.extra.trim() ? `- 补充：${form.extra.trim()}` : null,
    ]
      .filter(Boolean)
      .join('\n');
    onSubmit(text);
  }

  return (
    <div className="jd-form">
      <div className="form-grid">
        <Field label="岗位名称">
          <input
            className="input"
            placeholder="高级前端工程师"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
          />
        </Field>
        <Field label="部门 / 业务组">
          <input
            className="input"
            placeholder="技术中心 · Web 平台组"
            value={form.dept}
            onChange={(e) => set('dept', e.target.value)}
          />
        </Field>
        <Field label="职级">
          <input
            className="input"
            placeholder="P7"
            value={form.level}
            onChange={(e) => set('level', e.target.value)}
          />
        </Field>
        <Field label="工作地">
          <input
            className="input"
            placeholder="杭州 / 上海"
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
          />
        </Field>
        <Field label="薪资">
          <input
            className="input"
            placeholder="30-55K · 16薪"
            value={form.salary}
            onChange={(e) => set('salary', e.target.value)}
          />
        </Field>
        <Field label="招聘人数 (HC)">
          <input
            type="number"
            min={1}
            className="input"
            value={form.headcount}
            onChange={(e) => set('headcount', Math.max(1, Number(e.target.value) || 1))}
          />
        </Field>
      </div>

      <div style={{ height: 'var(--s-4)' }} />

      <ChipField
        label="必备技能 / 经验（回车添加）"
        chips={form.mustHave}
        onChange={(v) => set('mustHave', v)}
        tone="neon"
      />

      <div style={{ height: 'var(--s-3)' }} />

      <ChipField
        label="加分项（可选）"
        chips={form.niceToHave}
        onChange={(v) => set('niceToHave', v)}
        tone="cyan"
      />

      <div style={{ height: 'var(--s-3)' }} />

      <Field label="补充要求（可选）">
        <textarea
          className="textarea"
          placeholder="比如：有微前端实战经验优先；对低代码方向感兴趣；..."
          value={form.extra}
          onChange={(e) => set('extra', e.target.value)}
          rows={3}
        />
      </Field>

      <div className="jd-form-foot">
        <button type="button" className="btn btn-sm" onClick={closeCanvas}>
          <X size={12} /> 取消
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={submit}
          disabled={!canSubmit}
        >
          <Send size={12} /> 生成 JD
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function ChipField({
  label,
  chips,
  onChange,
  tone,
}: {
  label: string;
  chips: string[];
  onChange: (v: string[]) => void;
  tone: 'neon' | 'cyan';
}) {
  const [draft, setDraft] = React.useState('');
  function add() {
    const v = draft.trim();
    if (!v) return;
    if (chips.includes(v)) {
      setDraft('');
      return;
    }
    onChange([...chips, v]);
    setDraft('');
  }
  function remove(c: string) {
    onChange(chips.filter((x) => x !== c));
  }
  return (
    <div>
      <label className="label">{label}</label>
      <div className="chip-input">
        {chips.map((c) => (
          <Chip key={c} variant={tone}>
            {c}
            <button type="button" className="chip-x" onClick={() => remove(c)} aria-label={`移除 ${c}`}>
              <X size={10} />
            </button>
          </Chip>
        ))}
        <input
          className="chip-input-add"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add();
            } else if (e.key === 'Backspace' && draft === '' && chips.length > 0) {
              onChange(chips.slice(0, -1));
            }
          }}
          placeholder={chips.length === 0 ? '回车添加' : ''}
        />
        {draft && (
          <button type="button" className="ci-pill" onClick={add}>
            <Plus size={10} /> 添加
          </button>
        )}
      </div>
    </div>
  );
}
