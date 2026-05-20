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
import { QuestionSet, type QuestionSetData } from './canvas/QuestionSet';
import { Recommendation, type MatchListData } from './canvas/Recommendation';
import { Report, type PipelineReportData } from './canvas/Report';
import {
  ResumeResults,
  ResumeScan,
  type ResumeResultsData,
} from './canvas/ResumeScan.client';
import { ResumeUpload } from './canvas/ResumeUpload.client';
import { useCanvas, canvasTitle, type CanvasState } from '@/lib/store/canvas';
import { formatJobLabel } from '@/lib/display';
import type { Job } from '@/types';
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

type QuickPrompt =
  | { kind: 'send'; icon: typeof Briefcase; text: string }
  | { kind: 'open-upload'; icon: typeof Upload; text: string };

type SuggestedAction = { icon: typeof Briefcase; text: string; prompt?: string };

type JobPickerState = {
  messageId: string;
  sourceText: string;
  topK: number;
};

const HITL_TOOL_NAMES = new Set([
  'ask_role',
  'ask_level',
  'ask_location',
  'ask_salary',
  'ask_skills',
  'ask_headcount',
]);

const JD_ID_RE = /\bJD-\d{4}-\d{4}\b/i;

function makeLocalMessageId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseTopK(text: string) {
  const match = text.match(/\btop\s*(\d{1,2})\b/i) ?? text.match(/前\s*(\d{1,2})\s*(?:个|位|名)?/);
  const value = match?.[1] ? Number.parseInt(match[1], 10) : 5;
  if (!Number.isFinite(value)) return 5;
  return Math.max(1, Math.min(20, value));
}

function shouldAskForJobBeforeMatching(text: string) {
  const normalized = text.trim();
  if (!normalized || JD_ID_RE.test(normalized)) return false;
  if (/(追问|面试|讨论|聊聊|问什么|问题)/.test(normalized)) return false;
  return /(候选人|简历|匹配|推荐|排序|排行|排名|top|Top|TOP)/.test(normalized);
}

function buildAssistantSuggestions(canvas: CanvasState): SuggestedAction[] {
  if (canvas.kind === 'match-list') {
    const firstCandidate = canvas.data.candidates[0];
    return [
      {
        icon: Users,
        text: '基于这位候选人，生成一组面试追问。',
        prompt: firstCandidate
          ? `围绕简历 ${firstCandidate.id} 生成面试追问。`
          : '生成一组面试追问。',
      },
      { icon: TrendingUp, text: '汇总一下当前招聘漏斗，给我 3 条关键洞察。' },
      { icon: Upload, text: '我要上传一批新简历。' },
    ];
  }
  if (canvas.kind === 'pipeline-report') {
    return [
      { icon: Users, text: '把候选人按匹配度排个序，给我 top 5。' },
      { icon: Briefcase, text: '我想起草一份新 JD。' },
      { icon: Upload, text: '我要上传一批新简历。' },
    ];
  }
  return [
    { icon: Users, text: '把候选人按匹配度排个序，给我 top 5。' },
    { icon: TrendingUp, text: '汇总一下当前招聘漏斗，给我 3 条关键洞察。' },
    { icon: Briefcase, text: '我想起草一份新 JD。' },
  ];
}

function contextualPrompt(text: string, canvas: CanvasState) {
  const normalized = text.trim();
  if (
    canvas.kind === 'match-list' &&
    /(追问|面试|讨论|聊聊|问什么|问题)/.test(normalized)
  ) {
    const firstCandidate = canvas.data.candidates[0];
    if (firstCandidate) return `围绕简历 ${firstCandidate.id} 生成面试追问。`;
  }
  return normalized;
}

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

export function ChatStream({ jobs, initialPrompt }: { jobs: Job[]; initialPrompt?: string }) {
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
  const [pendingAssistant, setPendingAssistant] = React.useState(false);
  const [jobPickers, setJobPickers] = React.useState<JobPickerState[]>([]);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const canvas = useCanvas((s) => s.state);
  const setCanvas = useCanvas((s) => s.set);
  const resetCanvas = useCanvas((s) => s.reset);

  const busy = status === 'streaming' || status === 'submitted';
  const quickPrompts = React.useMemo<QuickPrompt[]>(() => {
    return [
      { kind: 'send', icon: Briefcase, text: '我想起草一份新 JD。' },
      { kind: 'send', icon: Users, text: '把候选人按匹配度排个序，给我 top 5。' },
      { kind: 'send', icon: TrendingUp, text: '汇总一下当前招聘漏斗，给我 3 条关键洞察。' },
      { kind: 'open-upload', icon: Upload, text: '上传一批新简历' },
    ];
  }, []);

  // 工具结果到达 → 写入 canvas store
  React.useEffect(() => {
    const latest = latestCanvasOutput(messages);
    if (!latest) return;
    let next: CanvasState | null = null;
    if (latest.kind === 'jd-draft') next = { kind: 'jd-draft', data: latest.payload as JDDraftData };
    else if (latest.kind === 'match-list') next = { kind: 'match-list', data: latest.payload as MatchListData };
    else if (latest.kind === 'pipeline-report') next = { kind: 'pipeline-report', data: latest.payload as PipelineReportData };
    else if (latest.kind === 'resume-results') next = { kind: 'resume-results', data: latest.payload as ResumeResultsData };
    else if (latest.kind === 'question-set') next = { kind: 'question-set', data: latest.payload as QuestionSetData };
    if (next) setCanvas(next);
  }, [messages, setCanvas]);

  // 新消息进来时自动滚动到底部
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status, pendingAssistant, jobPickers]);

  React.useEffect(() => {
    if (!pendingAssistant) return;
    const latest = messages[messages.length - 1];
    if (error || status === 'streaming' || latest?.role === 'assistant') {
      setPendingAssistant(false);
    }
  }, [error, messages, pendingAssistant, status]);

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
    const t = contextualPrompt(text, canvas);
    if (!t) return;
    if (busy) stop();
    autoSendRef.current = false;
    cancelPendingHITL();
    autoSendRef.current = true;
    resetCanvas();
    if (shouldAskForJobBeforeMatching(t)) {
      const userId = makeLocalMessageId('local-user');
      const assistantId = makeLocalMessageId('local-assistant');
      setMessages((prev) => [
        ...prev,
        { id: userId, role: 'user', parts: [{ type: 'text', text: t }] },
        {
          id: assistantId,
          role: 'assistant',
          parts: [{ type: 'text', text: '先选一个职位，我会直接用这个职位去做匹配度排序。' }],
        },
      ]);
      setJobPickers((prev) => [
        ...prev,
        { messageId: assistantId, sourceText: t, topK: parseTopK(t) },
      ]);
      setPendingAssistant(false);
      setInput('');
      textareaRef.current?.focus();
      return;
    }
    setPendingAssistant(true);
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
    if (p.kind === 'open-upload') {
      setCanvas({ kind: 'resume-upload' });
      return;
    }
    submit(p.text);
  }

  function chooseJobForMatching(picker: JobPickerState, job: Job) {
    setJobPickers((prev) => prev.filter((p) => p.messageId !== picker.messageId));
    submit(`把 ${formatJobLabel(job, { maxTitle: 18 })} 的候选人按匹配度排个序，给我 top ${picker.topK}。`);
  }

  const initialPromptSentRef = React.useRef(false);
  React.useEffect(() => {
    if (!initialPrompt || initialPromptSentRef.current || busy) return;
    initialPromptSentRef.current = true;
    resetCanvas();
    setPendingAssistant(true);
    void sendMessage({ text: initialPrompt });
    textareaRef.current?.focus();
  }, [busy, initialPrompt, resetCanvas, sendMessage]);

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
                    {quickPrompts.map((p) => {
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
                  {m.role === 'assistant' &&
                    jobPickers
                      .filter((p) => p.messageId === m.id)
                      .map((picker) => (
                        <div key={picker.messageId} className="job-picker">
                          <div className="job-picker-head">
                            <Briefcase size={12} />
                            最近录入的 {jobs.length} 个职位
                          </div>
                          {jobs.length === 0 ? (
                            <div className="job-picker-empty">还没有可选择的职位。</div>
                          ) : (
                            <div className="job-picker-list">
                              {jobs.map((job) => (
                                <button
                                  key={job.id}
                                  type="button"
                                  className="job-picker-item"
                                  onClick={() => chooseJobForMatching(picker, job)}
                                  disabled={busy}
                                >
                                  <span className="job-picker-title">
                                    {formatJobLabel(job, { maxTitle: 16 })}
                                  </span>
                                  <span className="job-picker-meta">
                                    {job.dept} · {job.status} · {job.createdAt}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                  {m.role === 'assistant' && !busy && (
                    <div className="suggestion-bubbles">
                      {buildAssistantSuggestions(canvas).map((action) => {
                        const Icon = action.icon;
                        return (
                          <button
                            key={action.text}
                            type="button"
                            className="suggestion-chip"
                            onClick={() => submit(action.prompt ?? action.text)}
                          >
                            <Icon size={12} />
                            <span>{action.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {pendingAssistant && status !== 'streaming' && (
              <div className="msg">
                <div className="msg-avatar agent">R</div>
                <div className="msg-body">
                  <div className="msg-header">
                    <span className="msg-name">{agentName}</span>
                    <span className="msg-tag">招聘 Agent</span>
                    <span className="stream-dot" />
                  </div>
                  <div className="msg-text">
                    <span className="thinking">
                      <span className="thinking-dot" />
                      <span className="thinking-dot" />
                      <span className="thinking-dot" />
                    </span>
                  </div>
                </div>
              </div>
            )}

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
                <button
                  type="button"
                  className="ci-pill"
                  onClick={() => setCanvas({ kind: 'resume-upload' })}
                  disabled={busy}
                >
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
            {canvas.kind === 'question-set' && <QuestionSet data={canvas.data} />}
            {canvas.kind === 'resume-upload' && <ResumeUpload jobs={jobs} />}
            {canvas.kind === 'resume-scan' && (
              <ResumeScan
                taskId={canvas.taskId}
                resumeIds={canvas.resumeIds}
                jobId={canvas.jobId}
              />
            )}
            {canvas.kind === 'resume-results' && <ResumeResults data={canvas.data} />}
          </div>
        </div>
      </aside>
    </div>
  );
}
