import { PDFParse } from 'pdf-parse';
import {
  assessTextQuality,
  cleanExtractedText,
  textQualityError,
  type TextQuality,
} from './text-quality';

export type ParseResult =
  | { ok: true; text: string; pageCount: number; quality: TextQuality }
  | { ok: false; error: string };

/**
 * pdf-parse v2 是 class-based API：new PDFParse({data}) → getText() → destroy()
 * 必须显式 destroy，否则会泄漏 PDF.js 内部 worker。
 *
 * 失败分类：
 *   - 加密 PDF / 错误格式 → 抛 InvalidPDFException 等
 *   - 扫描版 PDF（图像无文本）→ ok:true 但 text 为空，调用方判空再决定要不要再走 OCR
 */
export async function parsePdf(buffer: Buffer): Promise<ParseResult> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText({ pageJoiner: '' });
    const text = cleanExtractedText(result.text ?? '');
    const quality = assessTextQuality(text);
    const error = textQualityError('PDF', quality);
    if (error) {
      return { ok: false, error };
    }
    return {
      ok: true,
      text,
      pageCount: result.total,
      quality,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  } finally {
    await parser.destroy().catch(() => {
      /* destroy 偶发抛错（已被 destroy 等），吞掉 */
    });
  }
}
