'use client';

import * as React from 'react';
import { useChat } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
import {
  AlertTriangle,
  Briefcase,
  Plus,
  Send,
  Sparkle,
  TrendingUp,
  Upload,
  Users,
  X,
} from '@/components/icons/Icon';
import { Markdown } from './canvas/Markdown';
import { CanvasEmpty } from './canvas/CanvasEmpty';
import { JDDraft, type JDDraftData } from './canvas/JDDraft';
import { Recommendation, type MatchListData } from './canvas/Recommendation';
import { Report, type PipelineReportData } from './canvas/Report';

const agentName = process.env.NEXT_PUBLIC_AGENT_NAME ?? 'Rui';

const QUICK_PROMPTS = [
  { icon: Briefcase, text: '为 Web 平台组 起草一份「高级前端工程师」JD，要 P7、杭州/上海、要求 React + 微前端经验。' },
  { icon: Users, text: '把 JD-2024-0118 的候选人按匹配度排个序，给我 top 5。' },
  { icon: TrendingUp, text: '汇总一下当前招聘漏斗，给我 3 条关键洞察。' },
  { icon: Upload, text: '我想批量上传一批新简历。' },
];

type CanvasState =
  | { kind: 'empty' }
  | { kind: 'jd-draft'; title: string; data: JDDraftData }
  | { kind: 'match-list'; title: string; data: MatchListData }
  | { kind: 'pipeline-report'; title: string; data: PipelineReportData };

/** 从消息流里向后扫一次，挑最近一个 tool-result 决定画布。 */
function deriveCanvas(messages: UIMessage[]): CanvasState {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (!msg || msg.role !== 'assistant') continue;
    for (let j = msg.parts.length - 1; j >= 0; j--) {
      const part = msg.parts[j];
      if (!part || !('type' in part)) continue;
      // v5+ tool 结果统一形如 `tool-<name>` 类型，state === 'output-available'
      const t = part.type;
      if (typeof t !== 'string' || !t.startsWith('tool-')) continue;
      // 取 output（spec §9 + 工具自己返回的形状）
      const out = (part as { output?: unknown; state?: string }).output;
      if (!out || typeof out !== 'object') continue;
      const obj = out as { kind?: string };
      if (obj.kind === 'jd-draft') {
        return {
          kind: 'jd-draft',
          title: `JD · ${(out as JDDraftData).meta.title}`,
          data: out as JDDraftData,
        };
      }
      if (obj.kind === 'match-list') {
        return {
          kind: 'match-list',
          title: '候选人智能推荐',
          data: out as MatchListData,
        };
      }
      if (obj.kind === 'pipeline-report') {
        return {
          kind: 'pipeline-report',
          title: '招聘漏斗 · 当前',
          data: out as PipelineReportData,
        };
      }
    }
  }
  return { kind: 'empty' };
}

function renderMessagePart(part: UIMessage['parts'][number], key: React.Key): React.ReactNode {
  if (!('type' in part)) return null;
  if (part.type === 'text') {
    return <Markdown key={key} source={part.text} />;
  }
  if (typeof part.type === 'string' && part.type.startsWith('tool-')) {
    const state = (part as { state?: string }).state;
    const toolName = part.type.slice('tool-'.length);
    if (state === 'output-available') {
      return (
        <div key={key} className="msg-hint">
          <Sparkle size={11} /> 已生成「{toolName}」结果，看右侧画布。
        </div>
      );
    }
    return (
      <div key={key} className="msg-hint">
        <span className="spin-mini" /> 调用工具 <strong>{toolName}</strong> 中…
      </div>
    );
  }
  return null;
}

export function ChatStream() {
  const { messages, sendMessage, stop, status, error, clearError } = useChat({});
  const [input, setInput] = React.useState('');
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const busy = status === 'streaming' || status === 'submitted';
  const canvas = React.useMemo(() => deriveCanvas(messages), [messages]);

  // 新消息进来时自动滚动到底部
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  function submit() {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    void sendMessage({ text });
    textareaRef.current?.focus();
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // ⌘/Ctrl + Enter 发送
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  }

  function fireQuickPrompt(text: string) {
    if (busy) return;
    void sendMessage({ text });
  }

  return (
    <div className="work canvas-open">
      <div className="chat-pane">
        <div className="chat-scroll" ref={scrollRef}>
          <div className="chat-inner">
            {/* 欢迎语 + Quick Prompts —— 仅在没有任何消息时显示 */}
            {messages.length === 0 && (
              <div className="msg">
                <div className="msg-avatar agent">R</div>
                <div className="msg-body">
                  <div className="msg-header">
                    <span className="msg-name">{agentName}</span>
                    <span className="msg-tag">招聘 Agent</span>
                  </div>
                  <div className="msg-text">
                    你好，思雨。我是 <strong>{agentName}</strong>，你的招聘协作 Agent。
                    我可以帮你 <strong>起草 JD</strong>、<strong>评分简历</strong>、
                    <strong>推荐候选人</strong>，以及 <strong>汇总招聘漏斗</strong>。
                  </div>
                  <div className="prompt-grid">
                    {QUICK_PROMPTS.map((p) => {
                      const Icon = p.icon;
                      return (
                        <button
                          key={p.text}
                          type="button"
                          className="prompt-card"
                          onClick={() => fireQuickPrompt(p.text)}
                          disabled={busy}
                        >
                          <Icon size={14} />
                          <span>{p.text}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={`msg ${m.role === 'user' ? 'msg-user' : ''}`}>
                <div className={`msg-avatar ${m.role === 'user' ? 'user' : 'agent'}`}>
                  {m.role === 'user' ? '陈' : 'R'}
                </div>
                <div className="msg-body">
                  {m.role === 'assistant' && (
                    <div className="msg-header">
                      <span className="msg-name">{agentName}</span>
                      {busy && m === messages[messages.length - 1] && (
                        <span className="stream-dot" />
                      )}
                    </div>
                  )}
                  <div className="msg-text">{m.parts.map((p, i) => renderMessagePart(p, i))}</div>
                </div>
              </div>
            ))}

            {/* §6.6.4 LLM 中断红 banner + 重试 */}
            {error && (
              <div className="msg">
                <div className="msg-avatar agent" style={{ background: 'var(--bad-bg)', color: 'var(--bad)' }}>
                  <AlertTriangle size={12} />
                </div>
                <div className="msg-body">
                  <div
                    className="msg-text"
                    style={{
                      background: 'var(--bad-bg)',
                      border: '1px solid rgba(248,113,113,0.25)',
                      borderRadius: 'var(--r-2)',
                      padding: '10px 12px',
                    }}
                  >
                    <strong style={{ color: 'var(--bad)' }}>对话中断</strong>
                    <div style={{ fontSize: 12, marginTop: 4, color: 'var(--fg-1)' }}>
                      {error.message || '上游 LLM 暂时不可用。'}
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                      <button type="button" className="btn btn-sm" onClick={() => clearError()}>
                        <X size={11} /> 关闭
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="chat-input-wrap">
          <div className="chat-input">
            <textarea
              ref={textareaRef}
              className="chat-textarea"
              placeholder="跟 Rui 说点什么…（⌘/Ctrl + Enter 发送）"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              disabled={busy}
            />
            <div className="chat-input-foot">
              <div className="chat-toolset">
                <button type="button" className="ci-pill" disabled>
                  <Plus size={11} /> 关联 JD
                </button>
                <button type="button" className="ci-pill" disabled>
                  <Upload size={11} /> 上传简历
                </button>
              </div>
              {busy ? (
                <button type="button" className="btn btn-sm" onClick={() => stop()}>
                  <X size={12} /> 停止
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={submit}
                  disabled={!input.trim()}
                >
                  <Send size={12} /> 发送
                </button>
              )}
            </div>
            <div className="chat-disclaimer">
              Rui 仍在持续学习中，关键决策请结合你的判断。
            </div>
          </div>
        </div>
      </div>

      {/* 右侧画布 —— 根据最近一次 tool 结果切换 */}
      <aside className="canvas-pane">
        <div className="canvas-frame">
          <div className="canvas-head">
            <div className="canvas-title">
              <span className="canvas-title-pin" />
              <span>
                {canvas.kind === 'empty'
                  ? 'Workspace'
                  : 'title' in canvas
                    ? canvas.title
                    : 'Workspace'}
              </span>
            </div>
          </div>
          <div className="canvas-body">
            {canvas.kind === 'empty' && <CanvasEmpty />}
            {canvas.kind === 'jd-draft' && <JDDraft data={canvas.data} />}
            {canvas.kind === 'match-list' && <Recommendation data={canvas.data} />}
            {canvas.kind === 'pipeline-report' && <Report data={canvas.data} />}
          </div>
        </div>
      </aside>
    </div>
  );
}
