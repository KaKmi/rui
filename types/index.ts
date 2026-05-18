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
  | '解析失败' // M3.1：上传成功但 pdf-parse/mammoth 抽不到文本
  | '待评分'   // M3.1：上传 + 解析成功，等 M3.2 评分
  | 'AI 已评分'
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

/**
 * Resume 现在贯穿"上传 → 解析 → 评分"三个阶段：
 *   M3.1 上传阶段：id / status / appliedFor / 文件元信息 / parsedText
 *     —— 大部分人物字段（name/age/...）是 null，待评分回填
 *   M3.2 评分阶段：score_resume 回填 name/age/edu/yoe/current/score/breakdown/...
 *   M1.2 mock 数据：所有字段都齐
 *
 * 所以下面"评分后字段"全部 optional；UI 渲染时按需 fallback 占位文案。
 */
export interface Resume {
  id: string; // "R-9821" 或自动生成 "R-{nanoid}"
  status: ResumeStatus;

  // 关联
  appliedFor: string; // Job.id
  appliedAt: string;

  // M3.1 上传时落库的文件元信息（M1.2 mock 没有）
  originalFileUrl?: string | null;
  originalFileName?: string | null;
  originalFileSize?: number | null;
  originalMimeType?: string | null;
  parsedText?: string | null;
  parseError?: string | null;

  // M3.2 评分后回填（M1.2 mock 已填好）
  name?: string | null;
  gender?: '男' | '女' | null;
  age?: number | null;
  edu?: string | null;
  yoe?: number | null;
  current?: string | null;
  expected?: string | null;
  location?: string | null;
  score?: number | null; // 0-100；null 表示未评分（spec §6.6.7）
  breakdown?: ResumeBreakdown | null;
  summary?: string | null;
  pros: string[];
  cons: string[];
  interview: string[];
  skills: string[];
  workHistory?: WorkHistoryItem[] | null;
}
