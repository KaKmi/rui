'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Chat, Briefcase, Users, Settings } from '@/components/icons/Icon';

type NavItemDef = {
  href: string;
  label: string;
  icon: (p: { size?: number; className?: string }) => React.ReactNode;
};

const PRIMARY: NavItemDef[] = [
  { href: '/chat', label: '对话', icon: Chat },
  { href: '/jobs', label: '职位', icon: Briefcase },
  { href: '/resumes', label: '简历池', icon: Users },
];

const agentName = process.env.NEXT_PUBLIC_AGENT_NAME ?? 'Rui';

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="nav">
      <div className="nav-brand">
        <div className="nav-brand-mark">R</div>
        <div>
          <div className="nav-brand-text">{agentName}</div>
          <div className="nav-brand-sub">Recruiter AI</div>
        </div>
      </div>

      <div className="nav-section-label">工作台</div>
      {PRIMARY.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const IconCmp = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item${active ? ' is-active' : ''}`}
          >
            <span className="nav-icon">
              <IconCmp size={16} />
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}

      <div className="nav-footer">
        <div className="nav-avatar">陈</div>
        <div>
          <div className="nav-user-name">陈思雨</div>
          <div className="nav-user-role">HR · 招聘组</div>
        </div>
        <Settings size={14} style={{ marginLeft: 'auto', color: 'var(--fg-3)' }} />
      </div>
    </aside>
  );
}
