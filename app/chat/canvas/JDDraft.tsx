import { Copy, Check, PenLine } from '@/components/icons/Icon';
import { Chip } from '@/components/ui/Chip';
import { Markdown } from './Markdown';

export type JDDraftData = {
  meta: {
    title: string;
    dept: string;
    level: string;
    location: string;
    salary: string;
    headcount: number;
    skills: string[];
  };
  markdown: string;
};

export function JDDraft({ data }: { data: JDDraftData }) {
  return (
    <div className="jd-draft">
      <div className="jd-draft-header">
        <div>
          <div style={{ fontSize: 'var(--t-lg)', fontWeight: 600, color: 'var(--fg-0)' }}>
            {data.meta.title}
          </div>
          <div className="jd-draft-meta">
            {data.meta.dept} · {data.meta.level} · {data.meta.location} · {data.meta.salary} · HC {data.meta.headcount}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {data.meta.skills.map((s) => (
          <Chip key={s} variant="neon">
            {s}
          </Chip>
        ))}
      </div>

      <div className="jd-md">
        <Markdown source={data.markdown} />
      </div>

      <div className="jd-draft-foot">
        <button type="button" className="btn btn-sm">
          <PenLine size={12} /> 改写
        </button>
        <button type="button" className="btn btn-sm">
          <Copy size={12} /> 复制
        </button>
        <button type="button" className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }}>
          <Check size={12} /> 保存为职位
        </button>
      </div>
    </div>
  );
}
