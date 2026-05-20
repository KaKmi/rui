import { describe, expect, it } from 'vitest';
import { inferForcedToolRoute } from '@/lib/ai/chat-routing';

describe('chat tool routing', () => {
  it('forces candidate matching when a JD id and match intent are present', () => {
    const route = inferForcedToolRoute('把 JD-2024-0118 的候选人按匹配度排个序，给我 top 5。');

    expect(route?.toolName).toBe('match_candidates');
    expect(route?.instruction).toContain('jobId="JD-2024-0118"');
    expect(route?.instruction).toContain('topK=5');
  });

  it('forces question suggestions for resume interview discussion', () => {
    const route = inferForcedToolRoute('围绕 R-BXJZXM0MNI 生成面试追问');

    expect(route?.toolName).toBe('suggest_questions');
    expect(route?.instruction).toContain('resumeId="R-BXJZXM0MNI"');
  });

  it('does not force a tool for generic chat', () => {
    expect(inferForcedToolRoute('这个页面看起来有点奇怪')).toBeNull();
  });
});
