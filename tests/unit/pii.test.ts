import { describe, expect, it } from 'vitest';
import { redactResumeForLLM } from '@/lib/ai/pii';
import { assessTextQuality, cleanExtractedText } from '@/lib/parsers/text-quality';


describe('resume text cleaning and PII redaction', () => {
  it('compacts PDF-spaced Chinese text and removes duplicate cells', () => {
    const text = cleanExtractedText('技 术 栈\n12 万+\t12 万+\nReact\tTypeScript');

    expect(text).toContain('技术栈');
    expect(text).toContain('12 万+');
    expect(text).toContain('React\tTypeScript');
  });

  it('redacts spaced Chinese names and direct contact fields', () => {
    const result = redactResumeForLLM(
      [
        '赵 鹏 程\t赵 鹏 程',
        '姓名：张 三',
        '手机：13812345678',
        '邮箱：demo@example.com',
        '身份证：310101199001011234',
        '10 年前端经验，React / TypeScript / Node.js',
      ].join('\n'),
      'R-TEST',
    );

    expect(result.candidateLabel).toBe('候选人 R-TEST');
    expect(result.text).not.toContain('赵鹏程');
    expect(result.text).not.toContain('张三');
    expect(result.text).not.toContain('13812345678');
    expect(result.text).not.toContain('demo@example.com');
    expect(result.text).not.toContain('310101199001011234');
    expect(result.text).toContain('[PHONE]');
    expect(result.text).toContain('[EMAIL]');
    expect(result.text).toContain('[ID_CARD]');
    expect(result.stats.names).toBeGreaterThanOrEqual(2);
  });

  it('flags image-only or nearly empty extraction as low quality', () => {
    const quality = assessTextQuality(' \n  \n');

    expect(quality.flags).toContain('too-short');
  });
});
