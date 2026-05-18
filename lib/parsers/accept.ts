/**
 * 客户端安全的接受文件类型常量。
 * 单独放一个零依赖模块，避免 ResumeUpload 等 client component
 * 通过 lib/parsers/index.ts 传递 import pdf-parse 把 ~250kB 拉进浏览器 bundle。
 *
 * 服务端的 parseResume() 在 lib/parsers/index.ts 里。
 */

export const ACCEPTED_MIME = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
} as const;

export const ACCEPTED_EXT = ['.pdf', '.docx'] as const;

/** input[accept] 属性值 */
export const ACCEPT_ATTR = `${ACCEPTED_MIME.pdf},${ACCEPTED_MIME.docx},${ACCEPTED_EXT.join(',')}`;

export function isAcceptedMime(mime: string | null | undefined): boolean {
  if (!mime) return false;
  return mime === ACCEPTED_MIME.pdf || mime === ACCEPTED_MIME.docx;
}

/** 浏览器在 Win + WPS 等环境下偶尔 MIME 报空；退化按扩展名判 */
export function isAcceptedByName(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith('.pdf') || lower.endsWith('.docx');
}
