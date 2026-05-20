/**
 * 扫描件 PDF 的 OCR 降级通道 —— 腾讯云通用印刷体识别 (GeneralBasicOCR)。
 *
 * 选这套方案的原因：
 *  - 中文识别率 95%+，比本地 tesseract.js 高一大截
 *  - 直接吃 PDF base64 + 页号，省掉自己用 pdfjs 渲染那一层
 *  - 数据走腾讯云国内节点，符合 CLAUDE.md "数据不出境" 的要求
 *  - 免费额度 1000 次/月，够日常开发与小规模 demo
 *
 * 环境变量（缺任一项 → OCR 直接返回失败，原 pdf-parse 报错原样抛回）：
 *  - TENCENT_OCR_SECRET_ID
 *  - TENCENT_OCR_SECRET_KEY
 *  - TENCENT_OCR_REGION（可选，默认 ap-guangzhou）
 */
import { ocr } from 'tencentcloud-sdk-nodejs-ocr';
import { log } from '@/lib/log';

const MAX_PAGES = 10; // 单份简历 OCR 最多 10 页，超出截断
const MAX_PDF_BYTES = 7 * 1024 * 1024; // 腾讯云 PDF base64 上限 7MB

type OcrPage = {
  page: number;
  text: string;
  chars: number;
  ms: number;
};

let clientPromise: Promise<InstanceType<typeof ocr.v20181119.Client> | null> | null = null;

async function getClient(): Promise<InstanceType<typeof ocr.v20181119.Client> | null> {
  if (clientPromise) return clientPromise;
  clientPromise = (async () => {
    const secretId = process.env.TENCENT_OCR_SECRET_ID;
    const secretKey = process.env.TENCENT_OCR_SECRET_KEY;
    if (!secretId || !secretKey) {
      log.warn('ocr/missing-credentials', {
        hint: '需要在 .env.local 配置 TENCENT_OCR_SECRET_ID / TENCENT_OCR_SECRET_KEY',
      });
      return null;
    }
    const region = process.env.TENCENT_OCR_REGION ?? 'ap-guangzhou';
    return new ocr.v20181119.Client({
      credential: { secretId, secretKey },
      region,
      profile: { httpProfile: { endpoint: 'ocr.tencentcloudapi.com' } },
    });
  })();
  return clientPromise;
}

export async function ocrPdfBuffer(buffer: Buffer, pageCount: number): Promise<string> {
  if (buffer.length > MAX_PDF_BYTES) {
    throw new Error(`PDF 超过 ${Math.round(MAX_PDF_BYTES / 1024 / 1024)}MB（腾讯云 OCR 上限）`);
  }

  const client = await getClient();
  if (!client) {
    throw new Error('未配置腾讯云 OCR 凭据');
  }

  const pdfBase64 = buffer.toString('base64');
  const totalPages = Math.min(pageCount, MAX_PAGES);
  const pages: OcrPage[] = [];

  for (let i = 1; i <= totalPages; i += 1) {
    const t0 = Date.now();
    try {
      const res = await client.GeneralBasicOCR({
        ImageBase64: pdfBase64,
        IsPdf: true,
        PdfPageNumber: i,
        LanguageType: 'zh',
      });
      const text = (res.TextDetections ?? [])
        .map((d) => d.DetectedText)
        .filter((s): s is string => Boolean(s))
        .join('\n');
      const ms = Date.now() - t0;
      log.info('ocr/page', { page: i, chars: text.length, ms });
      pages.push({ page: i, text, chars: text.length, ms });
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      log.warn('ocr/page-fail', { page: i, ms: Date.now() - t0, err });
      // 单页失败不拖死整份；继续下一页
    }
  }

  if (pages.length === 0) {
    throw new Error('所有页 OCR 都失败了');
  }

  return pages
    .sort((a, b) => a.page - b.page)
    .map((p) => p.text)
    .join('\n')
    .trim();
}
