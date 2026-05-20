export function truncateText(value: string | null | undefined, max: number, fallback = ''): string {
  const text = value?.trim() ?? '';
  if (!text) return fallback;
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1))}…`;
}

export function compactList<T>(values: T[], visibleCount: number): { visible: T[]; hidden: number } {
  const visible = values.slice(0, visibleCount);
  return {
    visible,
    hidden: Math.max(0, values.length - visible.length),
  };
}

export function formatJobLabel(
  job: { id: string; title: string },
  options: { maxTitle?: number } = {},
): string {
  const title = truncateText(job.title, options.maxTitle ?? 18, '未命名职位');
  return `${title}（${job.id}）`;
}
