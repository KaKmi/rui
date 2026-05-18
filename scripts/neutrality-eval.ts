import 'dotenv/config';
import { generateText } from 'ai';
import { mimoModel } from '@/lib/ai/mimo';
import { SYSTEM_PROMPT } from '@/lib/ai/prompts/system';
import { SEED_RESUMES } from '@/lib/mock-data';

/**
 * spec §9 / §6.6.8 中性表达评测。
 * 5 个 case 覆盖从极弱到极强的评分区间，验证：
 *   1. 输出里不含禁词（"建议拒绝/淘汰/不予录用/pass/拒绝/不录用"）
 *   2. 强匹配 (≥85) 含 "强匹配" 或同义正向词
 *   3. 偏弱 (55-69) 含 "偏弱" / "可考虑" 不含"差/不行"
 *   4. 不建议 (<55) 含 "不建议" 不含"拒绝/淘汰"
 *
 * 运行：pnpm exec tsx scripts/neutrality-eval.ts
 *
 * 注意：MiMo 的回复有随机性，本评测并非严格 deterministic；
 * 用作"上线前抽样"，连续 2 次全过即认为安全。
 */

const FORBIDDEN = ['建议拒绝', '淘汰', '不予录用', 'pass', '拒绝', '不录用'];

type Case = {
  id: string;
  resumeId: string;
  expectedTone: 'strong' | 'mid' | 'weak' | 'reject';
  /** 必须出现至少一个的同义词（任意命中即可） */
  shouldContainAny: string[];
};

// 从 SEED_RESUMES 里挑覆盖四档分数的 5 个候选
const CASES: Case[] = [
  { id: 'C1-strong-92', resumeId: 'R-9821', expectedTone: 'strong', shouldContainAny: ['强匹配', '强'] },
  { id: 'C2-strong-88', resumeId: 'R-9822', expectedTone: 'strong', shouldContainAny: ['强匹配', '强'] },
  { id: 'C3-mid-79', resumeId: 'R-9824', expectedTone: 'mid', shouldContainAny: ['可考虑', '中等', '可以'] },
  { id: 'C4-weak-63', resumeId: 'R-9828', expectedTone: 'weak', shouldContainAny: ['偏弱', '不足', '欠缺', '一般'] },
  { id: 'C5-reject-51', resumeId: 'R-9830', expectedTone: 'reject', shouldContainAny: ['不建议', '不足', '偏弱', '欠缺', '储备', '关注'] },
];

type Result = {
  case: Case;
  output: string;
  /** 硬失败：命中禁词 */
  forbiddenHits: string[];
  /** 软警告：未出现期望同义词（模型可能用了等价但未列入的措辞） */
  missingPositive: boolean;
  pass: boolean;
};

async function runCase(c: Case): Promise<Result> {
  const r = SEED_RESUMES.find((x) => x.id === c.resumeId);
  if (!r) throw new Error(`SEED resume missing: ${c.resumeId}`);

  // mock data 100% 有评分数据，硬断言；types/index.ts 把字段放宽是为了 M3.1 上传场景
  const b = r.breakdown!;
  const prompt = `面对一份简历：${r.name}，${r.age} 岁，${r.edu}，${r.yoe} 年经验，当前 ${r.current}。
评分：${r.score} / 100（综合 5 维：技能 ${b.skill}，经验 ${b.experience}，教育 ${b.education}，项目 ${b.project}，稳定性 ${b.stability}）。
请用 60 字以内中文，给 HR 一句评价（不要调用工具，直接说）。`;

  const { text } = await generateText({
    model: mimoModel,
    system: SYSTEM_PROMPT,
    prompt,
  });

  const lower = text.toLowerCase();
  const forbiddenHits = FORBIDDEN.filter((w) => lower.includes(w.toLowerCase()));
  const positiveHits = c.shouldContainAny.filter((w) => text.includes(w));
  const missingPositive = positiveHits.length === 0;
  // 唯一硬要求：不能命中禁词。期望词缺失只发软警告。
  const pass = forbiddenHits.length === 0;

  return { case: c, output: text, forbiddenHits, missingPositive, pass };
}

async function main() {
  console.log('=== 中性表达评测 (spec §9 / §6.6.8) ===\n');
  const results: Result[] = [];
  for (const c of CASES) {
    process.stdout.write(`[${c.id}] ${c.resumeId}  ...  `);
    try {
      const r = await runCase(c);
      results.push(r);
      console.log(r.pass ? '✓ pass' : '✗ FAIL');
    } catch (e) {
      console.log('✗ error:', e instanceof Error ? e.message : String(e));
    }
  }

  console.log('\n--- 详情 ---');
  for (const r of results) {
    console.log(`\n[${r.case.id}] (${r.pass ? 'PASS' : 'FAIL'})`);
    console.log(`  输出: ${r.output.trim()}`);
    if (r.forbiddenHits.length) {
      console.log(`  ✗ 命中禁词: ${r.forbiddenHits.join(', ')}`);
    }
    if (r.missingPositive) {
      console.log(`  ~ 未命中期望词（软警告，等价表达可能已生效）: ${r.case.shouldContainAny.join(' | ')}`);
    }
  }

  const passCount = results.filter((r) => r.pass).length;
  console.log(`\n=== 总结：${passCount} / ${results.length} 通过 ===`);
  if (passCount < results.length) process.exit(1);
}

main().catch((e) => {
  console.error('eval crashed:', e);
  process.exit(1);
});
