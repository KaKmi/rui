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

export type ParseStage = 'parsing' | 'ocr';

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
 * 用 unpdf 抽文字（serverless build of pdf.js，不依赖 DOMMatrix / @napi-rs/canvas）。
 *
 * 之所以换掉 pdf-parse@v2：v2 内部用 pdfjs-dist@5 ESM build，在 Vercel Lambda 里
 * 启动时 require('@napi-rs/canvas') 拿 DOMMatrix/ImageData/Path2D 做 polyfill，
 * 即使装回 @napi-rs/canvas，pnpm symlink + Vercel outputFileTracing 也常常漏掉
 * 平台 .node 二进制 —— 上线就 ReferenceError。
 *
 * unpdf 自带 serverless 友好的 pdfjs build，extractText 路径完全不依赖 native canvas。
 *
 * 抽不到文字（扫描件 / 图片型 PDF）走 OCR 降级（腾讯云 GeneralBasicOCR）。
 */
export async function parsePdf(
  buffer: Buffer,
  onStage?: (stage: ParseStage) => void,
): Promise<ParseResult> {
  onStage?.('parsing');
  let pageCount = 0;

  try {
    // 动态 import：unpdf 顶层有 worker 初始化代码，放到调用时再 import 让 Next 走外部 require
    const { extractText, getDocumentProxy } = await import('unpdf');
    const result = await withTimeout(
      (async () => {
        const pdf = await getDocumentProxy(new Uint8Array(buffer));
        return extractText(pdf, { mergePages: true });
      })(),
      PARSE_TIMEOUT_MS,
      'PDF 解析',
    );
    pageCount = result.totalPages;
    // mergePages: true 时 result.text 是 string
    const text = cleanExtractedText(result.text);
    const quality = assessTextQuality(text);
    const error = textQualityError('PDF', quality);
    if (!error) {
      return { ok: true, text, pageCount, quality };
    }
    // 抽不到有效文字 → 走 OCR；仅"太少/扫描件"类才尝试，乱码/版式异常直接 fail
    if (
      !quality.flags.includes('too-short') &&
      !quality.flags.includes('too-few-lines')
    ) {
      return { ok: false, error };
    }
    log.info('pdf/ocr-fallback', { reason: quality.flags.join(','), pageCount });
  } catch (e) {
    // unpdf 整个炸了（损坏/加密），不再尝试 OCR
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  // —— OCR 降级路径（腾讯云 GeneralBasicOCR）——
  onStage?.('ocr');
  try {
    const ocrText = cleanExtractedText(
      await withTimeout(ocrPdfBuffer(buffer, pageCount), OCR_TIMEOUT_MS, 'OCR 识别'),
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
