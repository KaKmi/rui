/**
 * 服务端 parser 入口：按 MIME / 文件名分发到 pdf-parse 或 mammoth。
 *
 * **此文件只能在 server 端 import**（带 pdf-parse + mammoth ~ 几百 kB），
 * 客户端要用接受类型常量请走 `@/lib/parsers/accept`。
 */
import { parsePdf, type ParseResult } from './pdf';
import { parseDocx } from './docx';
import { ACCEPTED_MIME, isAcceptedByName, isAcceptedMime } from './accept';

export type { ParseResult };
export { ACCEPTED_MIME, isAcceptedByName, isAcceptedMime };

export async function parseResume(
  buffer: Buffer,
  mime: string | null | undefined,
  fileName: string,
): Promise<ParseResult> {
  if (mime === ACCEPTED_MIME.pdf || fileName.toLowerCase().endsWith('.pdf')) {
    return parsePdf(buffer);
  }
  if (
    mime === ACCEPTED_MIME.docx ||
    fileName.toLowerCase().endsWith('.docx')
  ) {
    return parseDocx(buffer);
  }
  return { ok: false, error: `不支持的文件类型: ${mime ?? '(unknown)'} / ${fileName}` };
}
