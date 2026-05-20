/**
 * 扫描件 PDF 的 OCR 降级通道。
 *
 * 自渲染管线：pdfjs-dist（与 pdf-parse 同版本 5.4.296，避免 worker API 版本冲突）
 *  → @napi-rs/canvas 把每页渲染成 PNG
 *  → tesseract.js 识别中英文 → 拼接文本
 *
 * worker 单例 + 懒加载，复用一次启动 + 加载语言模型的开销（~3-5s）。
 * 语言模型从仓库内的 traineddata 目录加载，不走网络。
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createWorker, type Worker } from 'tesseract.js';
import { log } from '@/lib/log';

const LANGS = ['chi_sim', 'eng'];
const TRAINEDDATA_DIR = path.join(process.cwd(), 'lib', 'ocr', 'traineddata');
const MAX_PAGES = 10; // 单份简历 OCR 最多 10 页，超出截断
const RENDER_SCALE = 2; // 1x 对中文 OCR 偏糊，2x 文字清晰度足够、显存压力可接受

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const t0 = Date.now();
      const w = await createWorker(LANGS, 1, {
        langPath: pathToFileURL(TRAINEDDATA_DIR).toString(),
        gzip: false,
        cacheMethod: 'none',
      });
      log.info('ocr/worker-ready', { ms: Date.now() - t0, langs: LANGS });
      return w;
    })();
    workerPromise.catch(() => {
      workerPromise = null;
    });
  }
  return workerPromise;
}

type RenderedCanvas = {
  canvas: { toBuffer: (mime: string) => Buffer };
};

export async function ocrPdfBuffer(buffer: Buffer): Promise<string> {
  // 动态 import：pdfjs legacy 是 ESM-only，避免被 Next 客户端 bundler 拽到
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const worker = await getWorker();
  const pages: string[] = [];
  const totalPages = Math.min(doc.numPages, MAX_PAGES);

  try {
    for (let i = 1; i <= totalPages; i += 1) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      const factory = doc.canvasFactory as {
        create: (w: number, h: number) => RenderedCanvas;
        destroy: (entry: RenderedCanvas) => void;
      };
      const entry = factory.create(viewport.width, viewport.height);

      try {
        await page.render({ canvas: entry.canvas as unknown as HTMLCanvasElement, viewport }).promise;
        const png = entry.canvas.toBuffer('image/png');
        const t0 = Date.now();
        const { data } = await worker.recognize(png);
        log.info('ocr/page', {
          page: i,
          chars: data.text.length,
          confidence: Math.round(data.confidence),
          ms: Date.now() - t0,
        });
        pages.push(data.text);
      } finally {
        page.cleanup();
        factory.destroy(entry);
      }
    }
  } finally {
    await doc.destroy().catch(() => {});
  }

  return pages.join('\n').trim();
}
