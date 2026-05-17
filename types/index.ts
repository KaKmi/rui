/**
 * 数据模型 —— spec §7
 * M1.2 阶段先用 TS 类型 + mock；M1.3 起 Prisma schema 落地后与 generated types 对齐。
 */

export type JobStatus = '草稿' | '招聘中' | '已暂停' | '已关闭';
export type JobType = '全职' | '实习' | '外包';

export interface Job {
  id: string; // "JD-2024-0118"
  title: string;
  dept: string;
  level: string; // "P7" / "P6 / P7"
  location: string; // 多地用 " / " 分隔
  salary: string; // "30-55K · 16薪"
  type: JobType;
  status: JobStatus;
  owner: string; // 用人经理
  hr: string;
  headcount: number;
  // 漏斗（denormalized）
  resumes: number;
  interviewed: number;
  offer: number;
  createdAt: string;
  skills: string[];
  // 以下四项在历史数据里可能缺失（spec §7 必有，mock 数据宽松）
  description?: string;
  responsibilities?: string[];
  requirements?: string[];
  nice?: string[];
}

export type ResumeStatus =
  | 'AI 已评分'
  | '待评分'
  | '已邀面'
  | '已 offer'
  | '已淘汰';

export interface ResumeBreakdown {
  skill: number;
  experience: number;
  education: number;
  project: number;
  stability: number;
}

export interface WorkHistoryItem {
  co: string;
  title: string;
  dur: string;
}

export interface Resume {
  id: string; // "R-9821"
  name: string;
  gender: '男' | '女';
  age: number;
  edu: string; // "硕士 · 浙江大学"
  yoe: number;
  current: string;
  expected: string; // "40-55K"
  location: string;
  status: ResumeStatus;
  appliedFor: string; // Job.id
  appliedAt: string;
  score: number | null; // 0-100；null 表示未评分（spec §6.6.7）
  breakdown: ResumeBreakdown;
  summary: string;
  pros: string[];
  cons: string[];
  interview: string[];
  skills: string[];
  workHistory?: WorkHistoryItem[];
}
