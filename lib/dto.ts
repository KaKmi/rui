/**
 * Prisma row → spec §7 DTO 映射。
 *
 * Prisma 生成的类型把 createdAt 当 Date、把 Json 字段当 JsonValue，
 * 但 spec §7 / `types/index.ts` 里 createdAt 是 string、breakdown 是结构化对象。
 * 这一层把 DB 形态翻译成"前端契约"。
 *
 * Resume 现在贯穿上传/解析/评分三阶段，"评分后字段"在 DB 里都允许 null，
 * DTO 这里直接透传（不强制非空），交给 UI 渲染时按需 fallback。
 */
import type {
  Job as PrismaJob,
  Resume as PrismaResume,
} from '@prisma/client';
import type {
  Job,
  JobStatus,
  JobType,
  Resume,
  ResumeBreakdown,
  ResumeStatus,
  WorkHistoryItem,
} from '@/types';

function toDateString(d: Date): string {
  // "2024-05-11" 形式，与 prototype seed 一致
  return d.toISOString().slice(0, 10);
}

export function toJobDTO(j: PrismaJob): Job {
  return {
    id: j.id,
    title: j.title,
    dept: j.dept,
    level: j.level,
    location: j.location,
    salary: j.salary,
    type: j.type as JobType,
    status: j.status as JobStatus,
    owner: j.owner,
    hr: j.hr,
    headcount: j.headcount,
    resumes: j.resumes,
    interviewed: j.interviewed,
    offer: j.offer,
    createdAt: toDateString(j.createdAt),
    skills: j.skills,
    description: j.description,
    responsibilities: j.responsibilities,
    requirements: j.requirements,
    nice: j.nice,
  };
}

export function toResumeDTO(r: PrismaResume): Resume {
  return {
    id: r.id,
    status: r.status as ResumeStatus,
    appliedFor: r.appliedForId,
    appliedAt: r.appliedAt,

    // 文件元信息（M3.1）
    originalFileUrl: r.originalFileUrl,
    originalFileName: r.originalFileName,
    originalFileSize: r.originalFileSize,
    originalMimeType: r.originalMimeType,
    parsedText: r.parsedText,
    parseError: r.parseError,

    // 评分后字段（M3.2 回填；M1.2 mock 已填好）
    name: r.name,
    gender: r.gender as Resume['gender'],
    age: r.age,
    edu: r.edu,
    yoe: r.yoe,
    current: r.current,
    expected: r.expected,
    location: r.location,
    score: r.score,
    breakdown: r.breakdown ? (r.breakdown as unknown as ResumeBreakdown) : null,
    summary: r.summary,
    pros: r.pros,
    cons: r.cons,
    interview: r.interview,
    skills: r.skills,
    workHistory: r.workHistory ? (r.workHistory as unknown as WorkHistoryItem[]) : null,
  };
}
