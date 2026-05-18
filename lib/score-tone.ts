/**
 * 评分阈值映射 — 来源：spec §6.6.8
 *   ≥ 85         high   (强匹配 / ok)
 *   70 – 84      ''     (可考虑 / warn) — 默认 neon 紫
 *   55 – 69      mid    (偏弱   / bad)
 *   < 55         low    (不建议 / bad)
 *   null/undef   ''     (未评分) —— UI 应另外判断显示"待评分"
 *
 * 同一函数为 ScoreRing / BarScore / Badge 共用，确保边界一致。
 * 三个函数都接受 null/undefined，方便上游不用做空守 ——
 * 真正"未评分"判断由调用方用 `value == null ? '待评分' : verdictOfScore(value)` 显式处理。
 */
export type ScoreTone = 'high' | '' | 'mid' | 'low';

export function toneOfScore(value: number | null | undefined): ScoreTone {
  if (value == null) return '';
  if (value >= 85) return 'high';
  if (value >= 70) return '';
  if (value >= 55) return 'mid';
  return 'low';
}

/** ScoreRing / BarScore 阈值对应的 badge variant —— spec §6.6.8 */
export type BadgeVariant = 'neon' | 'cyan' | 'ok' | 'warn' | 'bad' | 'muted';
export function badgeVariantOfScore(value: number | null | undefined): BadgeVariant {
  if (value == null) return 'muted';
  if (value >= 85) return 'ok';
  if (value >= 70) return 'warn';
  return 'bad';
}

/** 面向 HR 的语义文案 —— spec §6.6.8（禁止"建议拒绝/淘汰"等表态） */
export function verdictOfScore(value: number | null | undefined): string {
  if (value == null) return '待评分';
  if (value >= 85) return '强匹配';
  if (value >= 70) return '可考虑';
  if (value >= 55) return '偏弱';
  return '不建议';
}
