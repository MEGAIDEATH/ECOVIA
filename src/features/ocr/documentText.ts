/**
 * Lazy, cached access to the OCR engines.
 *
 * - pdfjs-dist and tesseract.js are dynamically imported so neither lands in
 *   the landing-page bundle (they load only when a scan actually starts).
 * - The PDF text layer is read from up to `DEFAULT_PDF_TEXT_PAGES` pages before
 *   any OCR happens; OCR runs only when the primary number is still missing.
 * - Tesseract workers are cached per language set and auto-terminated after an
 *   idle period so they cannot accumulate memory for the whole session.
 * - Canvases are bounded (page renders and uploaded images) and released as
 *   soon as they are consumed.
 */

type PdfjsModule = typeof import('pdfjs-dist');
type TesseractWorker = import('tesseract.js').Worker;

export type OcrLanguages = 'ara+eng' | 'eng';

/* ------------------------------------------------------------------ */
/* pdf.js                                                              */
/* ------------------------------------------------------------------ */

let pdfjsPromise: Promise<PdfjsModule> | null = null;

async function loadPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist')
      .then((pdfjs) => {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url,
        ).toString();
        return pdfjs;
      })
      .catch((error: unknown) => {
        pdfjsPromise = null; // allow retry after failure
        throw error;
      });
  }
  return pdfjsPromise;
}

/** Hard caps so a huge PDF page or photo can never allocate an unbounded canvas. */
export const MAX_RENDER_DIMENSION = 3000;
export const MAX_RENDER_PIXELS = 9_000_000;
export const MAX_IMAGE_DIMENSION = 2200;

/** Keeps the requested scale but shrinks it to respect the render caps. */
export function clampRenderScale(width: number, height: number, requestedScale: number): number {
  if (width <= 0 || height <= 0) return requestedScale;
  const dimensionScale = MAX_RENDER_DIMENSION / Math.max(width, height);
  const pixelScale = Math.sqrt(MAX_RENDER_PIXELS / (width * height));
  return Math.min(requestedScale, dimensionScale, pixelScale);
}

/** PDFs sometimes arrive with an empty MIME type (e.g. from file managers). */
export function isPdfFile(file: File): boolean {
  if (file.type) return file.type === 'application/pdf';
  return /\.pdf$/i.test(file.name);
}

const IMAGE_EXTENSION_PATTERN = /\.(jpe?g|png|webp|gif)$/i;

/** Images sometimes arrive with an empty MIME type as well. */
export function isImageFile(file: File): boolean {
  if (file.type) return file.type.startsWith('image/');
  return IMAGE_EXTENSION_PATTERN.test(file.name);
}

export interface PdfTextPage {
  /** 1-based page number. */
  pageNumber: number;
  /** Raw text layer of the page (empty for scanned pages). */
  text: string;
}

export interface PdfReader {
  /** Text layers for the first `DEFAULT_PDF_TEXT_PAGES` pages, in order. */
  pages: PdfTextPage[];
  /** Renders a page to a JPEG data URL, clamped to the render caps. */
  renderPageDataUrl(pageNumber: number, scale: number): Promise<string>;
  destroy(): Promise<void>;
}

/** Legacy behavior only looked at page 1; covers are common, so read a few. */
export const DEFAULT_PDF_TEXT_PAGES = 5;

export async function openPdf(
  file: File,
  maxTextPages = DEFAULT_PDF_TEXT_PAGES,
): Promise<PdfReader> {
  const pdfjs = await loadPdfjs();
  const data = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data });

  let doc: Awaited<typeof loadingTask.promise>;
  try {
    doc = await loadingTask.promise;
  } catch (error) {
    // Never leak the loading task when the document cannot be opened.
    await loadingTask.destroy().catch(() => undefined);
    throw error;
  }

  try {
    const textPageCount = Math.min(doc.numPages, Math.max(1, maxTextPages));
    const pages: PdfTextPage[] = [];
    for (let pageNumber = 1; pageNumber <= textPageCount; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push({
        pageNumber,
        text: content.items.map((item) => ('str' in item ? item.str : '')).join(' '),
      });
      page.cleanup();
    }

    return {
      pages,
      async renderPageDataUrl(pageNumber: number, scale: number): Promise<string> {
        const page = await doc.getPage(pageNumber);
        const base = page.getViewport({ scale: 1 });
        const effectiveScale = clampRenderScale(base.width, base.height, scale);
        const viewport = page.getViewport({ scale: effectiveScale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context is unavailable.');
        }
        type RenderParams = Parameters<typeof page.render>[0];
        try {
          await page.render({ canvas, canvasContext: ctx, viewport } as unknown as RenderParams)
            .promise;
          return canvas.toDataURL('image/jpeg');
        } finally {
          // Release the backing store and page resources immediately.
          canvas.width = 0;
          canvas.height = 0;
          page.cleanup();
        }
      },
      async destroy(): Promise<void> {
        await loadingTask.destroy();
      },
    };
  } catch (error) {
    await loadingTask.destroy().catch(() => undefined);
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/* tesseract.js                                                        */
/* ------------------------------------------------------------------ */

/** Idle workers are terminated so wasm/language data cannot pile up. */
export const WORKER_IDLE_TIMEOUT_MS = 60_000;

interface CachedWorker {
  worker: Promise<TesseractWorker>;
  idleTimer: ReturnType<typeof setTimeout> | null;
}

const workers = new Map<OcrLanguages, CachedWorker>();

function clearIdleTimer(entry: CachedWorker): void {
  if (entry.idleTimer !== null) {
    clearTimeout(entry.idleTimer);
    entry.idleTimer = null;
  }
}

function createEntry(languages: OcrLanguages): CachedWorker {
  const entry: CachedWorker = {
    worker: import('tesseract.js').then(({ createWorker }) => createWorker(languages)),
    idleTimer: null,
  };
  // Handle the rejection here as well so a failed start is not reported as an
  // unhandled rejection; callers awaiting `entry.worker` still get the error.
  void entry.worker.catch(() => {
    if (workers.get(languages) === entry) workers.delete(languages);
  });
  workers.set(languages, entry);
  return entry;
}

async function terminateEntry(languages: OcrLanguages, entry: CachedWorker): Promise<void> {
  if (workers.get(languages) !== entry) return;
  workers.delete(languages);
  clearIdleTimer(entry);
  try {
    const worker = await entry.worker;
    await worker.terminate();
  } catch {
    /* worker never started or was already terminated */
  }
}

function scheduleIdleTermination(languages: OcrLanguages, entry: CachedWorker): void {
  clearIdleTimer(entry);
  entry.idleTimer = setTimeout(() => {
    void terminateEntry(languages, entry);
  }, WORKER_IDLE_TIMEOUT_MS);
}

/** Runs OCR over a data URL / URL / File using a cached worker. */
export async function recognizeText(
  source: string | File,
  languages: OcrLanguages,
): Promise<string> {
  const entry = workers.get(languages) ?? createEntry(languages);
  clearIdleTimer(entry);
  try {
    const worker = await entry.worker;
    const result = await worker.recognize(source);
    return result.data.text;
  } finally {
    scheduleIdleTermination(languages, entry);
  }
}

/** Terminates all cached OCR workers (teardown/tests). */
export async function disposeOcrResources(): Promise<void> {
  const entries = [...workers.entries()];
  workers.clear();
  await Promise.allSettled(
    entries.map(async ([, entry]) => {
      clearIdleTimer(entry);
      const worker = await entry.worker;
      await worker.terminate();
    }),
  );
}

/* ------------------------------------------------------------------ */
/* Image helpers                                                       */
/* ------------------------------------------------------------------ */

/**
 * Draws an image file onto a canvas (downscaled to `MAX_IMAGE_DIMENSION`) and
 * returns a JPEG data URL. Bounding the canvas keeps OCR memory predictable for
 * full-resolution phone photos.
 */
export function imageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(
          1,
          MAX_IMAGE_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight),
        );
        const width = Math.max(1, Math.round(img.naturalWidth * scale));
        const height = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context is unavailable.');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        canvas.width = 0;
        canvas.height = 0;
        resolve(dataUrl);
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('تعذر قراءة الصورة.'));
    };
    img.src = objectUrl;
  });
}
