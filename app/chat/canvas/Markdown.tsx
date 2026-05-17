import * as React from 'react';

/**
 * 极简 markdown 渲染：只支持 ## 二级标题、- 无序列表、**加粗**、普通段落。
 * JD / 报告这些场景够用；引入 react-markdown 等于多一个依赖收益不明显。
 */
function renderInline(text: string, keyPrefix: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<strong key={`${keyPrefix}-b-${i++}`}>{m[1]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function Markdown({ source }: { source: string }) {
  const lines = source.split('\n');
  const nodes: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let paraBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length) {
      nodes.push(
        <ul className="prose-list" key={`ul-${nodes.length}`}>
          {listBuffer.map((item, i) => (
            <li key={i}>{renderInline(item, `li-${nodes.length}-${i}`)}</li>
          ))}
        </ul>,
      );
      listBuffer = [];
    }
  };
  const flushPara = () => {
    if (paraBuffer.length) {
      const text = paraBuffer.join(' ');
      nodes.push(
        <p key={`p-${nodes.length}`} style={{ margin: '6px 0', lineHeight: 1.7 }}>
          {renderInline(text, `p-${nodes.length}`)}
        </p>,
      );
      paraBuffer = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('## ')) {
      flushList();
      flushPara();
      nodes.push(
        <h3 className="md-h2" key={`h-${nodes.length}`}>
          {line.slice(3)}
        </h3>,
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      flushPara();
      listBuffer.push(line.slice(2));
    } else if (line.trim() === '') {
      flushList();
      flushPara();
    } else {
      flushList();
      paraBuffer.push(line);
    }
  }
  flushList();
  flushPara();

  return <>{nodes}</>;
}
