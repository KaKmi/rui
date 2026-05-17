'use client';

import * as React from 'react';
import { useChat } from '@ai-sdk/react';
import { lastAssistantMessageIsCompleteWithToolCalls, type UIMessage } from 'ai';
import {
  AlertTriangle,
  Briefcase,
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
import { useCanvas, canvasTitle, type CanvasState } from '@/lib/store/canvas';
import {
  AskRole,
  AskLevel,
  AskLocation,
  AskSalary,
  AskSkills,
  AskHeadcount,
  AnsweredBadge,
} from './widgets/AskWidgets.client';

const agentName = process.env.NEXT_PUBLIC_AGENT_NAME ?? 'Rui';
// Mock 单用户身份（spec / CLAUDE.md 钉死「陈思雨」）；接 auth 后这两个常量从 session 读
const USER_NAME = '陈思雨';
const USER_ROLE = 'HR · 招聘组';

type QuickPrompt = { icon: typeof Briefcase; text: string };

const QUICK_PROMPTS: QuickPrompt[] = [
  { icon: Briefcase, text: '我想起草一份新 JD。' },
  { icon: Users, text: '把 JD-2024-0118 的候选人按匹配度排个序，给我 top 5。' },
  { icon: TrendingUp, text: '汇总一下当前招聘漏斗，给我 3 条关键洞察。' },
  { icon: Upload, text: '我想批量上传一批新简历。' },
];

const HITL_TOOL_NAMES = new Set([
  'ask_role',
  'ask_level',
  'ask_location',
  'ask_salary',
  'ask_skills',
  'ask_headcount',
]);

/** 在最近的 assistant 消息里找一个 server-tool 的 output，决定画布 */
function latestCanvasOutput(messages: UIMessage[]): { kind: string; payload: unknown } | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (!msg || msg.role !== 'assistant') continue;
    for (let j = msg.parts.length - 1; j >= 0; j--) {
      const part = msg.parts[j];
      if (!part || !('type' in part)) continue;
      const t = part.type;
      if (typeof t !== 'string' || !t.startsWith('tool-')) continue;
      const out = (part as { output?: unknown }).output;
      if (out && typeof out === 'object' && 'kind' in out) {
        return { kind: String((out as { kind: unknown }).kind), payload: out };
      }
    }
  }
  return null;
}

type AddToolResult = (args: {
  tool: string;
  toolCallId: string;
  output: unknown;
}) => void;

/** 渲染一条 message 的某一个 part —— text / HITL tool widget / 服务端 tool 提示 */
function renderMessagePart(
  part: UIMessage['parts'][number],
  key: React.Key,
  ctx: { addToolResult: AddToolResult; busy: boolean },
): React.ReactNode {
  if (!('type' in part)) return null;
  if (part.type === 'text') {
    return <Markdown key={key} source={part.text} />;
  }
  if (typeof part.type !== 'string' || !part.type.startsWith('tool-')) return null;

  const toolName = part.type.slice('tool-'.length);
  const state = (part as { state?: string }).state;
  const toolCallId = (part as { toolCallId?: string }).toolCallId ?? '';
  const input = (part as { input?: unknown }).input;
  const output = (part as { output?: unknown }).output;

  // HITL 工具：未答 → render widget；已答 → 折叠成 badge；用户中断 → 折叠成红 badge
  if (HITL_TOOL_NAMES.has(toolName)) {
    if (state === 'output-available') {
      return <AnsweredBadge key={key} toolName={toolName} output={output} />;
    }
    if (state === 'output-error') {
      const errorText = (part as { errorText?: string }).errorText ?? '已中断';
      return (
        <div
          key={key}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--bad-bg)',
            border: '1px solid rgba(248,113,113,0.22)',
            color: 'var(--bad)',
            padding: '4px 10px',
            borderRadius: 'var(--r-pill)',
            fontSize: 11,
            marginTop: 6,
          }}
        >
          <X size={11} />
          <span style={{ color: 'var(--fg-2)' }}>
            {toolName.replace('ask_', '')}: <span style={{ color: 'var(--bad)' }}>{errorText}</span>
          </span>
        </div>
      );
    }
    if (state === 'input-available') {
      const onSubmit = (out: unknown) => ctx.addToolResult({ tool: toolName, toolCallId, output: out });
      switch (toolName) {
        case 'ask_role':
          return <AskRole key={key} input={input as Parameters<typeof AskRole>[0]['input']} onSubmit={onSubmit as Parameters<typeof AskRole>[0]['onSubmit']} disabled={ctx.busy} />;
        case 'ask_level':
          return <AskLevel key={key} input={input as Parameters<typeof AskLevel>[0]['input']} onSubmit={onSubmit as Parameters<typeof AskLevel>[0]['onSubmit']} disabled={ctx.busy} />;
        case 'ask_location':
          return <AskLocation key={key} input={input as Parameters<typeof AskLocation>[0]['input']} onSubmit={onSubmit as Parameters<typeof AskLocation>[0]['onSubmit']} disabled={ctx.busy} />;
        case 'ask_salary':
          return <AskSalary key={key} input={input as Parameters<typeof AskSalary>[0]['input']} onSubmit={onSubmit as Parameters<typeof AskSalary>[0]['onSubmit']} disabled={ctx.busy} />;
        case 'ask_skills':
          return <AskSkills key={key} input={input as Parameters<typeof AskSkills>[0]['input']} onSubmit={onSubmit as Parameters<typeof AskSkills>[0]['onSubmit']} disabled={ctx.busy} />;
        case 'ask_headcount':
          return <AskHeadcount key={key} input={input as Parameters<typeof AskHeadcount>[0]['input']} onSubmit={onSubmit as Parameters<typeof AskHeadcount>[0]['onSubmit']} disabled={ctx.busy} />;
      }
    }
    // input-streaming：tool 入参还在流；等齐了再 render
    if (state === 'input-streaming') {
      return (
        <div key={key} className="msg-hint">
          <span className="spin-mini" /> 正在生成提问…
        </div>
      );
    }
    // 兜底（未知 state）：不渲染，避免出现幽灵 spinner
    return null;
  }

  // 服务端工具：未完成 → spinner；完成 → 提示看画布
  if (state === 'output-available') {
    return (
      <div key={key} className="msg-hint">
        <Sparkle size={11} /> 已生成「{toolName}」结果，看右侧画布 →
      </div>
    );
  }
  return (
    <div key={key} className="msg-hint">
      <span className="spin-mini" /> 调用工具 <strong>{toolName}</strong> 中…
    </div>
  );
}

export function ChatStream() {
  /**
   * sendAutomaticallyWhen: HITL 工具 addToolResult 后自动续流。
   * 用 ref 守门：在 submit() 取消挂起 tool 时临时关掉自动续流，
   * 避免每个 addToolResult(error) 都触发一次新请求 —— 我们要的是
   * 「批量取消 + 跟一条用户新消息一起送」。
   */
  const autoSendRef = React.useRef(true);
  const { messages, sendMessage, stop, status, error, clearError, addToolResult, setMessages } =
    useChat({
      sendAutomaticallyWhen: (opts) => {
        if (!autoSendRef.current) return false;
        return lastAssistantMessageIsCompleteWithToolCalls(opts);
      },
    });
  const [input, setInput] = React.useState('');
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const canvas = useCanvas((s) => s.state);
  const setCanvas = useCanvas((s) => s.set);
  const resetCanvas = useCanvas((s) => s.reset);

  const busy = status === 'streaming' || status === 'submitted';

  // 工具结果到达 → 写入 canvas store
  React.useEffect(() => {
    const latest = latestCanvasOutput(messages);
    if (!latest) return;
    let next: CanvasState | null = null;
    if (latest.kind === 'jd-draft') next = { kind: 'jd-draft', data: latest.payload as JDDraftData };
    else if (latest.kind === 'match-list') next = { kind: 'match-list', data: latest.payload as MatchListData };
    else if (latest.kind === 'pipeline-report') next = { kind: 'pipeline-report', data: latest.payload as PipelineReportData };
    if (next) setCanvas(next);
  }, [messages, setCanvas]);

  // 新消息进来时自动滚动到底部
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  /**
   * 把所有挂起的 HITL ask_* 工具标成 output-error，让模型在下次请求里
   * 看到「用户取消了上轮提问」，符合 Anthropic 协议的 tool_use → tool_result
   * 配对要求，避免 "Tool result is missing for tool call ..." 报错。
   */
  function cancelPendingHITL() {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.role !== 'assistant') return m;
        let touched = false;
        const parts = m.parts.map((p) => {
          if (!('type' in p)) return p;
          if (typeof p.type !== 'string' || !p.type.startsWith('tool-')) return p;
          const toolName = p.type.slice('tool-'.length);
          if (!HITL_TOOL_NAMES.has(toolName)) return p;
          const state = (p as { state?: string }).state;
          if (state !== 'input-available') return p;
          touched = true;
          return {
            ...(p as object),
            state: 'output-error',
            errorText: '用户跳过了这次提问，发了新消息',
          } as typeof p;
        });
        return touched ? { ...m, parts } : m;
      }),
    );
  }

  /**
   * 发送消息 —— spec §6.6.5「新消息 → 旧流标 cancelled，旧画布内容立即销毁」
   *   1. stop() 取消任何正在进行的流
   *   2. 批量给挂起的 HITL tool 写 output-error（不触发 auto-send，靠 autoSendRef 守门）
   *   3. canvas 重置
   *   4. sendMessage 触发新一轮
   */
  function submit(text: string) {
    const t = text.trim();
    if (!t) return;
    if (busy) stop();
    autoSendRef.current = false;
    cancelPendingHITL();
    autoSendRef.current = true;
    resetCanvas();
    void sendMessage({ text: t });
    setInput('');
    textareaRef.current?.focus();
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit(input);
    }
  }

  function fireQuickPrompt(p: QuickPrompt) {
    if (busy) return;
    submit(p.text);
  }

  // 适配 addToolResult 的类型（库要求 tool 是泛型字面量，我们这里运行时已知合法名字）
  const onAddToolResult: AddToolResult = (args) => {
    (addToolResult as unknown as AddToolResult)(args);
  };

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
                          onClick={() => fireQuickPrompt(p)}
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
                  {m.role === 'assistant' ? (
                    <div className="msg-header">
                      <span className="msg-name">{agentName}</span>
                      <span className="msg-tag">招聘 Agent</span>
                      {busy && m === messages[messages.length - 1] && (
                        <span className="stream-dot" />
                      )}
                    </div>
                  ) : (
                    <div className="msg-header">
                      <span className="msg-tag">{USER_ROLE}</span>
                      <span className="msg-name">{USER_NAME}</span>
                    </div>
                  )}
                  <div className="msg-text">
                    {m.parts.map((p, i) =>
                      renderMessagePart(p, i, { addToolResult: onAddToolResult, busy }),
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* §6.6.4 LLM 中断红 banner + 重试 */}
            {error && (
              <div className="msg">
                <div
                  className="msg-avatar agent"
                  style={{ background: 'var(--bad-bg)', color: 'var(--bad)' }}
                >
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
                  onClick={() => submit(input)}
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

      {/* 右侧画布 —— store 驱动；jd-form 在前端打开，其余 kind 由 tool 结果填入 */}
      <aside className="canvas-pane">
        <div className="canvas-frame">
          <div className="canvas-head">
            <div className="canvas-title">
              <span className="canvas-title-pin" />
              <span>{canvasTitle(canvas)}</span>
            </div>
            {canvas.kind !== 'empty' && (
              <div className="canvas-head-tools">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => resetCanvas()}
                  aria-label="关闭画布"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
          <div className="canvas-body">
            {canvas.kind === 'empty' && <CanvasEmpty />}
            {canvas.kind === 'jd-draft' && <JDDraft data={canvas.data} />}
            {canvas.kind === 'match-list' && <Recommendation data={canvas.data} />}
            {canvas.kind === 'pipeline-report' && <Report data={canvas.data} />}
            {(canvas.kind === 'resume-upload' ||
              canvas.kind === 'resume-scan' ||
              canvas.kind === 'resume-results') && (
              <div className="empty" style={{ padding: 40 }}>
                {canvas.kind} —— M3 落地
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
