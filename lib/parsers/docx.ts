import mammoth from 'mammoth';
import type { ParseResult } from './pdf';
import { assessTextQuality, cleanExtractedText, textQualityError } from './text-quality';

/**
 * mammoth.extractRawText 从 .docx 抽纯文本，保留段落分隔，舍弃格式样式。
 * 抽取完成后与 PDF 走同一套清洗和质量判断，避免空文档/图片型文档进入评分。
 */
export async function parseDocx(buffer: Buffer): Promise<ParseResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = cleanExtractedText(result.value ?? '');
    const quality = assessTextQuality(text);
    const error = textQualityError('DOCX', quality);
    if (error) return { ok: false, error };

    return {
      ok: true,
      text,
      pageCount: 1,
      quality,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
