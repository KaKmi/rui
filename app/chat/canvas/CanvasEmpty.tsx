import { Sparkle, Briefcase, Users, Upload } from '@/components/icons/Icon';

/** spec §6.6.1 默认 canvas kind = empty */
export function CanvasEmpty() {
  return (
    <div className="canvas-empty">
      <div className="canvas-empty-inner">
        <div className="canvas-empty-mark">
          <Sparkle size={22} />
        </div>
        <div className="canvas-empty-title">Workspace</div>
        <div className="canvas-empty-sub">
          右侧画布会根据你的对话内容自动展开 —— 起草 JD、推荐候选人、汇总漏斗。
        </div>
        <div className="canvas-empty-hints">
          <span className="canvas-empty-hint">
            <Briefcase size={11} /> JD 草稿
          </span>
          <span className="canvas-empty-hint">
            <Upload size={11} /> 简历评分
          </span>
          <span className="canvas-empty-hint">
            <Users size={11} /> 候选推荐
          </span>
        </div>
      </div>
    </div>
  );
}
