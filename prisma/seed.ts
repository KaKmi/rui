import 'dotenv/config';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { SEED_JOBS, SEED_RESUMES } from '@/lib/mock-data';
import type { Resume } from '@/types';

/** Prisma Json 字段对 nested object 要求 InputJsonValue；TS 的精确类型不直接兼容，做一次显式装箱。 */
function asJson<T>(v: T): Prisma.InputJsonValue {
  return v as unknown as Prisma.InputJsonValue;
}

/** workHistory 可空：nullable Json 用 Prisma.DbNull 表示「写入 NULL」 */
function workHistoryOrNull(wh: Resume['workHistory']): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return wh ? asJson(wh) : Prisma.DbNull;
}

/**
 * 幂等 seed：用 upsert 按 id 覆盖；多次执行得到同一结果。
 * 在 Job / Resume 之外的模型（Conversation / Message / ScanTask）尚未建模 (M2/M3)。
 */
async function main() {
  const t0 = Date.now();

  for (const j of SEED_JOBS) {
    await prisma.job.upsert({
      where: { id: j.id },
      create: {
        id: j.id,
        title: j.title,
        dept: j.dept,
        level: j.level,
        location: j.location,
        salary: j.salary,
        type: j.type,
        status: j.status,
        owner: j.owner,
        hr: j.hr,
        headcount: j.headcount,
        resumes: j.resumes,
        interviewed: j.interviewed,
        offer: j.offer,
        createdAt: new Date(j.createdAt),
        skills: j.skills,
        description: j.description ?? '',
        responsibilities: j.responsibilities ?? [],
        requirements: j.requirements ?? [],
        nice: j.nice ?? [],
      },
      update: {
        title: j.title,
        dept: j.dept,
        level: j.level,
        location: j.location,
        salary: j.salary,
        type: j.type,
        status: j.status,
        owner: j.owner,
        hr: j.hr,
        headcount: j.headcount,
        resumes: j.resumes,
        interviewed: j.interviewed,
        offer: j.offer,
        skills: j.skills,
        description: j.description ?? '',
        responsibilities: j.responsibilities ?? [],
        requirements: j.requirements ?? [],
        nice: j.nice ?? [],
      },
    });
  }

  for (const r of SEED_RESUMES) {
    await prisma.resume.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        name: r.name,
        gender: r.gender,
        age: r.age,
        edu: r.edu,
        yoe: r.yoe,
        current: r.current,
        expected: r.expected,
        location: r.location,
        status: r.status,
        appliedForId: r.appliedFor,
        appliedAt: r.appliedAt,
        score: r.score,
        breakdown: asJson(r.breakdown),
        summary: r.summary,
        pros: r.pros,
        cons: r.cons,
        interview: r.interview,
        skills: r.skills,
        workHistory: workHistoryOrNull(r.workHistory),
      },
      update: {
        name: r.name,
        gender: r.gender,
        age: r.age,
        edu: r.edu,
        yoe: r.yoe,
        current: r.current,
        expected: r.expected,
        location: r.location,
        status: r.status,
        appliedForId: r.appliedFor,
        appliedAt: r.appliedAt,
        score: r.score,
        breakdown: asJson(r.breakdown),
        summary: r.summary,
        pros: r.pros,
        cons: r.cons,
        interview: r.interview,
        skills: r.skills,
        workHistory: workHistoryOrNull(r.workHistory),
      },
    });
  }

  const [jobCount, resumeCount] = await Promise.all([
    prisma.job.count(),
    prisma.resume.count(),
  ]);
  const dt = Date.now() - t0;
  console.log(`✓ Seed done in ${dt}ms — ${jobCount} jobs, ${resumeCount} resumes`);
}

main()
  .catch((e: unknown) => {
    console.error('✗ Seed failed:', e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
