'use client';

import { usePathname } from 'next/navigation';

const LABELS: Record<string, string> = {
  '/chat': '对话',
  '/jobs': '职位',
  '/resumes': '简历池',
};

export function TopBar() {
  const pathname = usePathname();
  const root = `/${pathname.split('/')[1] ?? ''}`;
  const label = LABELS[root] ?? '工作台';

  return (
    <header className="topbar">
      <div className="crumbs">
        <span>工作台</span>
        <span className="sep">/</span>
        <span className="now">{label}</span>
      </div>
      <div className="topbar-spacer" />
      <span className="pill">Agent 在线</span>
    </header>
  );
}
