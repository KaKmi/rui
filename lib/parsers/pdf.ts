import { PDFParse } from 'pdf-parse';
import { log } from '@/lib/log';
import { ocrPdfBuffer } from '@/lib/ocr';
import {
  assessTextQuality,
  cleanExtractedText,
  textQualityError,
  type TextQuality,
} from './text-quality';

export type ParseResult =
  | { ok: true; text: string; pageCount: number; quality: TextQuality; ocrUsed?: boolean }
  | { ok: false; error: string };

const PARSE_TIMEOUT_MS = 20_000;
const OCR_TIMEOUT_MS = 60_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} 超时（${ms}ms）`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });
}

/**
 * pdf-parse v2: new PDFParse({data}) → getText() → destroy()
 *
 * 注意：
 *  - destroy() 在 Node 端偶发不返回（pdfjs-dist 的 fake worker 没清干净），
 *    这里 fire-and-forget，避免阻塞下一份 PDF 的解析（serial 批量场景的真正 bug 源）。
 *  - getText() 自身也加 20s 超时，避免某个坏 PDF 卡死整个批次。
 */
export async function parsePdf(buffer: Buffer): Promise<ParseResult> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  let pageCount = 0;
  try {
    const result = await withTimeout(
      parser.getText({ pageJoiner: '' }),
      PARSE_TIMEOUT_MS,
      'PDF 解析',
    );
    pageCount = result.total;
    const text = cleanExtractedText(result.text ?? '');
    const quality = assessTextQuality(text);
    const error = textQualityError('PDF', quality);
    if (!error) {
      return { ok: true, text, pageCount, quality };
    }
    // pdf-parse 抽不出有效文字 → 降级 OCR；仅"太少/扫描件"类才走，乱码/版式异常就直接报错
    if (
      !quality.flags.includes('too-short') &&
      !quality.flags.includes('too-few-lines')
    ) {
      return { ok: false, error };
    }
    log.info('pdf/ocr-fallback', { reason: quality.flags.join(','), pageCount });
  } catch (e) {
    // pdf-parse 整个炸了（损坏/加密），不再尝试 OCR
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    void parser.destroy().catch(() => {});
  }

  // —— OCR 降级路径 ——
  try {
    const ocrText = cleanExtractedText(
      await withTimeout(ocrPdfBuffer(buffer), OCR_TIMEOUT_MS, 'OCR 识别'),
    );
    const ocrQuality = assessTextQuality(ocrText);
    const ocrError = textQualityError('PDF', ocrQuality);
    if (ocrError) {
      return { ok: false, error: `OCR 后仍${ocrError}` };
    }
    return { ok: true, text: ocrText, pageCount, quality: ocrQuality, ocrUsed: true };
  } catch (e) {
    return {
      ok: false,
      error: `OCR 识别失败：${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
