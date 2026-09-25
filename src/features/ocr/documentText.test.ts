import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  MAX_IMAGE_DIMENSION,
  MAX_RENDER_DIMENSION,
  MAX_RENDER_PIXELS,
  WORKER_IDLE_TIMEOUT_MS,
  clampRenderScale,
  disposeOcrResources,
  isImageFile,
  isPdfFile,
  recognizeText,
} from './documentText';

const createWorkerMock = vi.hoisted(() => vi.fn());
vi.mock('tesseract.js', () => ({ createWorker: createWorkerMock }));

function file(name: string, type = ''): File {
  return new File(['x'], name, { type });
}

describe('documentText file helpers', () => {
  it('detects PDFs by MIME type or extension', () => {
    expect(isPdfFile(file('doc.pdf', 'application/pdf'))).toBe(true);
    expect(isPdfFile(file('license.PDF'))).toBe(true);
    expect(isPdfFile(file('scan.png', 'image/png'))).toBe(false);
  });

  it('detects images by MIME type or extension', () => {
    expect(isImageFile(file('id.jpg', 'image/jpeg'))).toBe(true);
    expect(isImageFile(file('ID.JPG'))).toBe(true);
    expect(isImageFile(file('doc.pdf', 'application/pdf'))).toBe(false);
  });
});

describe('clampRenderScale', () => {
  it('keeps normal pages at the requested scale', () => {
    // A4 at scale 3 stays under both caps.
    expect(clampRenderScale(595, 842, 3)).toBe(3);
  });

  it('never exceeds the dimension or pixel caps', () => {
    const width = 5000;
    const height = 4000;
    const scale = clampRenderScale(width, height, 3);

    expect(scale).toBeLessThan(3);
    expect(Math.max(width, height) * scale).toBeLessThanOrEqual(MAX_RENDER_DIMENSION + 1);
    expect(width * height * scale * scale).toBeLessThanOrEqual(MAX_RENDER_PIXELS + 1);
    expect(MAX_IMAGE_DIMENSION).toBeGreaterThan(0);
  });
});

interface FakeWorker {
  recognize: ReturnType<typeof vi.fn>;
  terminate: ReturnType<typeof vi.fn>;
}

describe('OCR worker lifecycle', () => {
  let worker: FakeWorker;

  beforeEach(() => {
    vi.useFakeTimers();
    worker = {
      recognize: vi.fn().mockResolvedValue({ data: { text: 'ELESL-2023-1' } }),
      terminate: vi.fn().mockResolvedValue({}),
    };
    createWorkerMock.mockReset().mockResolvedValue(worker);
  });

  afterEach(async () => {
    await disposeOcrResources();
    vi.useRealTimers();
  });

  it('reuses a single worker for consecutive scans', async () => {
    expect(await recognizeText('data:image/jpeg;base64,x', 'eng')).toBe('ELESL-2023-1');
    expect(await recognizeText('data:image/jpeg;base64,y', 'eng')).toBe('ELESL-2023-1');

    expect(createWorkerMock).toHaveBeenCalledTimes(1);
    expect(worker.recognize).toHaveBeenCalledTimes(2);
    expect(worker.terminate).not.toHaveBeenCalled();
  });

  it('terminates the worker after the idle timeout', async () => {
    await recognizeText('data:image/jpeg;base64,x', 'eng');
    expect(worker.terminate).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(WORKER_IDLE_TIMEOUT_MS);
    expect(worker.terminate).toHaveBeenCalledTimes(1);

    // A later scan starts a fresh worker instead of using the terminated one.
    await recognizeText('data:image/jpeg;base64,y', 'eng');
    expect(createWorkerMock).toHaveBeenCalledTimes(2);
  });

  it('terminates every cached worker on dispose', async () => {
    await recognizeText('data:image/jpeg;base64,x', 'ara+eng');

    const other: FakeWorker = {
      recognize: vi.fn().mockResolvedValue({ data: { text: 'x' } }),
      terminate: vi.fn().mockResolvedValue({}),
    };
    createWorkerMock.mockResolvedValue(other);
    await recognizeText('data:image/jpeg;base64,y', 'eng');

    await disposeOcrResources();

    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(other.terminate).toHaveBeenCalledTimes(1);
  });
});