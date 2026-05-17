'use client';

import * as React from 'react';
import { Check, X, Plus, Minus } from '@/components/icons/Icon';
import { Chip } from '@/components/ui/Chip';

/**
 * JD 起草访谈 widgets —— 对应 lib/ai/tools/jd-interview/* 的 6 个 HITL 工具。
 * 每个 widget 把用户输入收集成 outputSchema 形状，通过 onSubmit 传给 ChatStream，
 * 由 ChatStream 调 useChat().addToolResult({tool, toolCallId, output}) 回灌。
 *
 * 视觉：嵌在 assistant 气泡里的小卡片，深一档 (--bg-3) 与正文气泡区分。
 * 提交后由父组件根据 part.state 切换到 AnsweredBadge，不在本组件内做状态切换。
 */

const SHELL_STYLE: React.CSSProperties = {
  background: 'var(--bg-3)',
  border: '1px solid var(--line-1)',
  borderRadius: 'var(--r-3)',
  padding: 14,
  marginTop: 8,
};

function WidgetShell({
  question,
  children,
  footer,
}: {
  question: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div style={SHELL_STYLE}>
      <div
        style={{
          fontSize: 'var(--t-md)',
          color: 'var(--fg-0)',
          fontWeight: 500,
          marginBottom: 10,
          lineHeight: 1.5,
        }}
      >
        {question}
      </div>
      {children}
      {footer && (
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
          {footer}
        </div>
      )}
    </div>
  );
}

// ============================================================
// ask_role
// ============================================================
export function AskRole({
  input,
  onSubmit,
  disabled,
}: {
  input: { question: string; presets: string[] };
  onSubmit: (out: { value: string }) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = React.useState('');
  function commit(v: string) {
    if (!v.trim()) return;
    onSubmit({ value: v.trim() });
  }
  return (
    <WidgetShell question={input.question}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {input.presets.map((p) => (
          <button
            key={p}
            type="button"
            className="ci-pill"
            disabled={disabled}
            onClick={() => commit(p)}
          >
            {p}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          className="input"
          placeholder="或者自己输入岗位名..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && commit(value)}
          disabled={disabled}
        />
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => commit(value)}
          disabled={disabled || !value.trim()}
        >
          <Check size={12} />
        </button>
      </div>
    </WidgetShell>
  );
}

// ============================================================
// ask_level —— 单选
// ============================================================
export function AskLevel({
  input,
  onSubmit,
  disabled,
}: {
  input: { question: string; presets: string[] };
  onSubmit: (out: { value: string }) => void;
  disabled?: boolean;
}) {
  const [custom, setCustom] = React.useState('');
  return (
    <WidgetShell question={input.question}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {input.presets.map((p) => (
          <button
            key={p}
            type="button"
            className="btn btn-sm"
            disabled={disabled}
            onClick={() => onSubmit({ value: p })}
          >
            {p}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          className="input"
          placeholder="其他职级（如 M3 / D7）..."
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && custom.trim() && onSubmit({ value: custom.trim() })}
          disabled={disabled}
        />
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => custom.trim() && onSubmit({ value: custom.trim() })}
          disabled={disabled || !custom.trim()}
        >
          <Check size={12} />
        </button>
      </div>
    </WidgetShell>
  );
}

// ============================================================
// ask_location —— 多选
// ============================================================
export function AskLocation({
  input,
  onSubmit,
  disabled,
}: {
  input: { question: string; presets: string[] };
  onSubmit: (out: { values: string[] }) => void;
  disabled?: boolean;
}) {
  const [selected, setSelected] = React.useState<string[]>([]);
  const [custom, setCustom] = React.useState('');
  function toggle(v: string) {
    setSelected((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
  }
  function addCustom() {
    const v = custom.trim();
    if (v && !selected.includes(v)) setSelected((s) => [...s, v]);
    setCustom('');
  }
  return (
    <WidgetShell
      question={input.question}
      footer={
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => onSubmit({ values: selected })}
          disabled={disabled || selected.length === 0}
        >
          <Check size={12} /> 确定 ({selected.length})
        </button>
      }
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {input.presets.map((p) => {
          const on = selected.includes(p);
          return (
            <button
              key={p}
              type="button"
              className="ci-pill"
              disabled={disabled}
              style={
                on
                  ? {
                      background: 'rgba(167,139,250,0.18)',
                      borderColor: 'rgba(167,139,250,0.45)',
                      color: 'var(--neon-1)',
                    }
                  : undefined
              }
              onClick={() => toggle(p)}
            >
              {on && <Check size={10} />}
              {p}
            </button>
          );
        })}
        {selected
          .filter((s) => !input.presets.includes(s))
          .map((s) => (
            <Chip key={s} variant="neon">
              {s}
              <button type="button" className="chip-x" onClick={() => toggle(s)}>
                <X size={10} />
              </button>
            </Chip>
          ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          className="input"
          placeholder="补充其他城市..."
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())}
          disabled={disabled}
        />
        <button type="button" className="btn btn-sm" onClick={addCustom} disabled={disabled || !custom.trim()}>
          <Plus size={12} />
        </button>
      </div>
    </WidgetShell>
  );
}

// ============================================================
// ask_salary —— 3 个数字
// ============================================================
export function AskSalary({
  input,
  onSubmit,
  disabled,
}: {
  input: { question: string };
  onSubmit: (out: { min: number; max: number; monthsPerYear: number }) => void;
  disabled?: boolean;
}) {
  const [min, setMin] = React.useState(20);
  const [max, setMax] = React.useState(40);
  const [months, setMonths] = React.useState(14);
  const ok = min > 0 && max >= min && months >= 12;
  return (
    <WidgetShell
      question={input.question}
      footer={
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => onSubmit({ min, max, monthsPerYear: months })}
          disabled={disabled || !ok}
        >
          <Check size={12} /> 确定 ({min}-{max}K · {months}薪)
        </button>
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--fg-1)' }}>
        <input
          className="input"
          type="number"
          min={1}
          max={200}
          value={min}
          onChange={(e) => setMin(Number(e.target.value) || 0)}
          disabled={disabled}
          style={{ width: 80 }}
        />
        <span style={{ color: 'var(--fg-3)' }}>–</span>
        <input
          className="input"
          type="number"
          min={1}
          max={200}
          value={max}
          onChange={(e) => setMax(Number(e.target.value) || 0)}
          disabled={disabled}
          style={{ width: 80 }}
        />
        <span style={{ color: 'var(--fg-3)' }}>K · </span>
        <input
          className="input"
          type="number"
          min={12}
          max={20}
          value={months}
          onChange={(e) => setMonths(Number(e.target.value) || 14)}
          disabled={disabled}
          style={{ width: 64 }}
        />
        <span style={{ color: 'var(--fg-3)' }}>薪/年</span>
      </div>
    </WidgetShell>
  );
}

// ============================================================
// ask_skills —— preset 点选 + 自由添加
// ============================================================
export function AskSkills({
  input,
  onSubmit,
  disabled,
}: {
  input: { question: string; kind: 'must' | 'nice'; presets: string[] };
  onSubmit: (out: { values: string[] }) => void;
  disabled?: boolean;
}) {
  const [selected, setSelected] = React.useState<string[]>(input.presets);
  const [custom, setCustom] = React.useState('');
  const minHint = input.kind === 'must' ? '至少 3 个' : '可选';
  function toggle(v: string) {
    setSelected((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
  }
  function addCustom() {
    const v = custom.trim();
    if (v && !selected.includes(v)) setSelected((s) => [...s, v]);
    setCustom('');
  }
  const canSubmit = input.kind === 'nice' || selected.length >= 3;
  return (
    <WidgetShell
      question={input.question}
      footer={
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => onSubmit({ values: selected })}
          disabled={disabled || !canSubmit}
        >
          <Check size={12} /> 确定 ({selected.length} 项)
        </button>
      }
    >
      <div style={{ fontSize: 11, color: 'var(--fg-3)', marginBottom: 8 }}>
        {input.kind === 'must' ? '必备技能' : '加分项'} · {minHint}
      </div>
      <div className="chip-input" style={{ marginBottom: 8 }}>
        {selected.map((s) => (
          <Chip key={s} variant={input.kind === 'must' ? 'neon' : 'cyan'}>
            {s}
            <button type="button" className="chip-x" onClick={() => toggle(s)}>
              <X size={10} />
            </button>
          </Chip>
        ))}
        <input
          className="chip-input-add"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder={selected.length === 0 ? '回车添加' : ''}
          disabled={disabled}
        />
      </div>
      {input.presets.filter((p) => !selected.includes(p)).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--fg-3)', alignSelf: 'center' }}>推荐：</span>
          {input.presets
            .filter((p) => !selected.includes(p))
            .map((p) => (
              <button key={p} type="button" className="ci-pill" disabled={disabled} onClick={() => toggle(p)}>
                <Plus size={10} /> {p}
              </button>
            ))}
        </div>
      )}
    </WidgetShell>
  );
}

// ============================================================
// ask_headcount —— number stepper
// ============================================================
export function AskHeadcount({
  input,
  onSubmit,
  disabled,
}: {
  input: { question: string };
  onSubmit: (out: { value: number }) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = React.useState(1);
  return (
    <WidgetShell
      question={input.question}
      footer={
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => onSubmit({ value })}
          disabled={disabled}
        >
          <Check size={12} /> 确定 ({value} 人)
        </button>
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => setValue((v) => Math.max(1, v - 1))}
          disabled={disabled || value <= 1}
        >
          <Minus size={12} />
        </button>
        <input
          className="input"
          type="number"
          min={1}
          max={50}
          value={value}
          onChange={(e) => setValue(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
          disabled={disabled}
          style={{ width: 70, textAlign: 'center' }}
        />
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => setValue((v) => Math.min(50, v + 1))}
          disabled={disabled || value >= 50}
        >
          <Plus size={12} />
        </button>
      </div>
    </WidgetShell>
  );
}

// ============================================================
// AnsweredBadge —— 工具结果已回灌后的折叠态
// ============================================================
export function AnsweredBadge({
  toolName,
  output,
}: {
  toolName: string;
  output: unknown;
}) {
  let summary = '';
  const o = output as Record<string, unknown>;
  if (toolName === 'ask_role' || toolName === 'ask_level' || toolName === 'ask_headcount') {
    summary = String(o.value ?? '');
  } else if (toolName === 'ask_location' || toolName === 'ask_skills') {
    summary = Array.isArray(o.values) ? (o.values as string[]).join(' · ') : '';
  } else if (toolName === 'ask_salary') {
    summary = `${o.min}-${o.max}K · ${o.monthsPerYear}薪`;
  } else {
    summary = '已回答';
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'rgba(74,222,128,0.10)',
        border: '1px solid rgba(74,222,128,0.25)',
        color: 'var(--ok)',
        padding: '4px 10px',
        borderRadius: 'var(--r-pill)',
        fontSize: 11,
        marginTop: 6,
      }}
    >
      <Check size={11} />
      <span style={{ color: 'var(--fg-1)' }}>
        {toolName.replace('ask_', '')}: <strong style={{ color: 'var(--fg-0)' }}>{summary}</strong>
      </span>
    </div>
  );
}
