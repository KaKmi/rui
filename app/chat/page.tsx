import { Sparkle, Briefcase, Users, TrendingUp, Upload, Send, Plus } from '@/components/icons/Icon';

const agentName = process.env.NEXT_PUBLIC_AGENT_NAME ?? 'Rui';

/** spec §6.6.1 默认 canvas kind = empty */
function CanvasEmpty() {
  return (
    <div className="canvas-empty">
      <div className="canvas-empty-inner">
        <div className="canvas-empty-mark">
          <Sparkle size={22} />
        </div>
        <div className="canvas-empty-title">Workspace</div>
        <div className="canvas-empty-sub">右侧画布会根据你的对话内容自动展开 —— 起草 JD、上传简历、查看推荐。</div>
        <div className="canvas-empty-hints">
          <span className="canvas-empty-hint"><Briefcase size={11} /> JD 草稿</span>
          <span className="canvas-empty-hint"><Upload size={11} /> 简历评分</span>
          <span className="canvas-empty-hint"><Users size={11} /> 候选推荐</span>
        </div>
      </div>
    </div>
  );
}

/** spec §6.1 首屏 4 个 Quick Prompt */
const QUICK_PROMPTS = [
  { icon: Briefcase, text: '为 Web 平台组 起草一份「高级前端工程师」JD' },
  { icon: Users, text: '把 JD-2024-0118 的候选人按匹配度排个序' },
  { icon: TrendingUp, text: '汇总本周的招聘漏斗，给我看 3 条关键洞察' },
  { icon: Upload, text: '我想批量上传一批新简历' },
];

export default function ChatPage() {
  return (
    <div className="work canvas-open">
      <div className="chat-pane">
        <div className="chat-scroll">
          <div className="chat-inner">
            {/* Agent 欢迎消息 */}
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

                {/* 4 个 Quick Prompt */}
                <div className="prompt-grid">
                  {QUICK_PROMPTS.map((p) => {
                    const Icon = p.icon;
                    return (
                      <button key={p.text} type="button" className="prompt-card">
                        <Icon size={14} />
                        <span>{p.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Composer —— M1.2 静态外壳（无 JS 行为）；M2 由 Composer.client.tsx 接管 */}
        <div className="chat-input-wrap">
          <div className="chat-input">
            <textarea
              className="chat-textarea"
              placeholder="跟 Rui 说点什么…（⌘/Ctrl + Enter 发送）"
              rows={1}
              disabled
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
              <button type="button" className="btn btn-primary btn-sm" disabled>
                <Send size={12} /> 发送
              </button>
            </div>
            <div className="chat-disclaimer">
              Rui 仍在持续学习中，关键决策请结合你的判断。
            </div>
          </div>
        </div>
      </div>

      {/* 右侧画布 —— 默认 empty 状态 */}
      <aside className="canvas-pane">
        <div className="canvas-frame">
          <div className="canvas-head">
            <div className="canvas-title">
              <span className="canvas-title-pin" />
              <span>Workspace</span>
            </div>
          </div>
          <div className="canvas-body">
            <CanvasEmpty />
          </div>
        </div>
      </aside>
    </div>
  );
}
