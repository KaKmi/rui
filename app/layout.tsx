import type { Metadata } from 'next';
import { SideNav } from '@/components/nav/SideNav';
import { TopBar } from '@/components/nav/TopBar';
import { Toaster } from '@/components/ui/Toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rui · AI 招聘协作 Agent',
  description: 'AI 招聘协作 Agent —— 对话生成 JD、智能匹配候选人、流式简历评分',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" data-density="cozy">
      <body>
        <div className="app-shell">
          <SideNav />
          <div className="main">
            <TopBar />
            {children}
          </div>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
