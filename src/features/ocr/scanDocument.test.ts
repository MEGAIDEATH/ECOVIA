import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ScanCancelledError, scanDocument } from './scanDocument';

const imageFileToDataUrlMock = vi.hoisted(() => vi.fn());
const recognizeTextMock = vi.hoisted(() => vi.fn());
const openPdfMock = vi.hoisted(() => vi.fn());

vi.mock('./documentText', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./documentText')>();
  return {
    ...actual,
    imageFileToDataUrl: imageFileToDataUrlMock,
    recognizeText: recognizeTextMock,
    openPdf: openPdfMock,
  };
});

function file(type: string, name = 'doc.pdf'): File {
  return new File(['x'], name, { type });
}

function pdfReader(texts: string[], renderPageDataUrl = vi.fn(), destroy = vi.fn()) {
  return {
    pages: texts.map((text, index) => ({ pageNumber: index + 1, text })),
    renderPageDataUrl,
    destroy,
  };
}

const PERSONAL_TEXT =
  'AHMED SALEH ALI 1098765432 966512345678';

describe('scanDocument', () => {
  beforeEach(() => {
    imageFileToDataUrlMock.mockResolvedValue('data:image/jpeg;base64,x');
    recognizeTextMock.mockReset();
    openPdfMock.mockReset();
  });

  it('runs image personal scans with ara+eng and extracts all fields', async () => {
    recognizeTextMock.mockResolvedValue(PERSONAL_TEXT);
    const result = await scanDocument(file('image/jpeg', 'id.jpg'), 'personal');
    expect(recognizeTextMock).toHaveBeenCalledWith('data:image/jpeg;base64,x', 'ara+eng');
    expect(result.nationalId).toBe('1098765432');
    expect(result.phone).toBe('0512345678');
    expect(result.name).toBe('AHMED SALEH ALI');
  });

  it('processes images for license scans too (legacy only handled PDFs)', async () => {
    recognizeTextMock.mockResolvedValue('ELESL-2023-777 | 01/02/2025');
    const result = await scanDocument(file('image/png', 'lic.png'), 'license');
    expect(recognizeTextMock).toHaveBeenCalledWith('data:image/jpeg;base64,x', 'eng');
    expect(result.license).toBe('ELESL-2023-777');
    expect(result.issueDate).toBe('2025-02-01');
  });

  it('uses PDF text first and skips OCR when the license is found on page 1', async () => {
    const renderPageDataUrl = vi.fn();
    const destroy = vi.fn();
    openPdfMock.mockResolvedValue(pdfReader(['ELESL-2023-42'], renderPageDataUrl, destroy));

    const result = await scanDocument(file('application/pdf'), 'license');
    expect(result.license).toBe('ELESL-2023-42');
    expect(recognizeTextMock).not.toHaveBeenCalled();
    expect(renderPageDataUrl).not.toHaveBeenCalled();
    expect(destroy).toHaveBeenCalled();
  });

  it('finds a license on a later page before falling back to OCR', async () => {
    const renderPageDataUrl = vi.fn();
    const destroy = vi.fn();
    openPdfMock.mockResolvedValue(
      pdfReader(['غلاف الترخيص', 'تعليمات', 'ELESL-2024-77 | 01/02/2025'], renderPageDataUrl, destroy),
    );

    const result = await scanDocument(file('application/pdf'), 'license');
    expect(result.license).toBe('ELESL-2024-77');
    expect(result.issueDate).toBe('2025-02-01');
    expect(recognizeTextMock).not.toHaveBeenCalled();
    expect(renderPageDataUrl).not.toHaveBeenCalled();
    expect(destroy).toHaveBeenCalled();
  });

  it('falls back to eng OCR rendering page 1 at scale 3.0 when text layers are empty', async () => {
    const renderPageDataUrl = vi.fn().mockResolvedValue('data:image/jpeg;base64,page');
    const destroy = vi.fn();
    openPdfMock.mockResolvedValue(
      pdfReader(['nothing useful', 'still nothing'], renderPageDataUrl, destroy),
    );
    recognizeTextMock.mockResolvedValue('CR 1010123456');

    const result = await scanDocument(file('application/pdf'), 'commercial');
    expect(renderPageDataUrl).toHaveBeenCalledWith(1, 3.0);
    expect(recognizeTextMock).toHaveBeenCalledWith('data:image/jpeg;base64,page', 'eng');
    expect(result.crNumber).toBe('1010123456');
    expect(destroy).toHaveBeenCalled();
  });

  it('falls back to ara+eng OCR at scale 2.0 for incomplete personal PDFs', async () => {
    const renderPageDataUrl = vi.fn().mockResolvedValue('data:image/jpeg;base64,page');
    const destroy = vi.fn();
    openPdfMock.mockResolvedValue(pdfReader(['partial 1098765432'], renderPageDataUrl, destroy));
    recognizeTextMock.mockResolvedValue(PERSONAL_TEXT);

    const result = await scanDocument(file('application/pdf'), 'personal');
    expect(renderPageDataUrl).toHaveBeenCalledWith(1, 2.0);
    expect(recognizeTextMock).toHaveBeenCalledWith('data:image/jpeg;base64,page', 'ara+eng');
    expect(result.phone).toBe('0512345678');
    expect(destroy).toHaveBeenCalled();
  });

  it('treats a .pdf file with an empty MIME type as a PDF', async () => {
    const destroy = vi.fn();
    openPdfMock.mockResolvedValue(pdfReader(['ELESL-2023-55'], vi.fn(), destroy));

    const result = await scanDocument(file('', 'license.PDF'), 'license');
    expect(result.license).toBe('ELESL-2023-55');
    expect(openPdfMock).toHaveBeenCalledTimes(1);
  });

  it('returns empty results for unsupported file types (legacy behavior)', async () => {
    const result = await scanDocument(file('text/plain', 'notes.txt'), 'personal');
    expect(result).toEqual({});
    expect(recognizeTextMock).not.toHaveBeenCalled();
  });

  it('propagates OCR failures so callers can show an Arabic error', async () => {
    recognizeTextMock.mockRejectedValue(new Error('worker crashed'));
    await expect(scanDocument(file('image/jpeg'), 'personal')).rejects.toThrow('worker crashed');
  });

  it('throws ScanCancelledError when cancelled mid-scan', async () => {
    recognizeTextMock.mockResolvedValue(PERSONAL_TEXT);
    await expect(
      scanDocument(file('image/jpeg'), 'personal', { isCancelled: () => true }),
    ).rejects.toBeInstanceOf(ScanCancelledError);
    expect(recognizeTextMock).not.toHaveBeenCalled();
  });

  it('always destroys the PDF page reader even when extraction throws', async () => {
    const destroy = vi.fn();
    openPdfMock.mockResolvedValue(
      pdfReader(['x'], vi.fn().mockRejectedValue(new Error('render failed')), destroy),
    );
    recognizeTextMock.mockResolvedValue('');
    // text layer incomplete for personal → render fails → error propagates, destroy still runs
    await expect(scanDocument(file('application/pdf'), 'personal')).rejects.toThrow(
      'render failed',
    );
    expect(destroy).toHaveBeenCalled();
  });
});