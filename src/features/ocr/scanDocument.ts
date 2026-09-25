import type { OCRResult } from '@/types';

import { extractCrNumber } from './extractors/cr';
import { extractLicenseInfo } from './extractors/license';
import { extractPersonalInfo } from './extractors/personal';
import {
  imageFileToDataUrl,
  isImageFile,
  isPdfFile,
  openPdf,
  recognizeText,
} from './documentText';

export type ScanKind = 'personal' | 'license' | 'commercial';

/** Thrown when a scan is cancelled (component unmounted / user navigated away). */
export class ScanCancelledError extends Error {
  constructor() {
    super('Scan cancelled');
    this.name = 'ScanCancelledError';
  }
}

export interface ScanOptions {
  isCancelled?: () => boolean;
}

function assertNotCancelled(options?: ScanOptions): void {
  if (options?.isCancelled?.()) throw new ScanCancelledError();
}

/** Later extraction results override earlier non-null fields (legacy merge semantics). */
function mergeResult(target: OCRResult, next: OCRResult): void {
  if (next.name) target.name = next.name;
  if (next.nationalId) target.nationalId = next.nationalId;
  if (next.phone) target.phone = next.phone;
  if (next.license) target.license = next.license;
  if (next.issueDate) target.issueDate = next.issueDate;
  if (next.crNumber) target.crNumber = next.crNumber;
}

function isPersonalComplete(result: OCRResult): boolean {
  return Boolean(result.nationalId && result.phone && result.name);
}

/**
 * Scans a document (PDF or image) and extracts fields according to `kind`.
 *
 * Semantics preserved from the legacy implementation:
 * - personal: PDF text layer first, `ara+eng` OCR fallback at scale 2.0 when
 *   anything is missing; images go straight to `ara+eng` OCR.
 * - license (specialist): PDF text layer first, `eng` OCR fallback at scale
 *   3.0 when no license was found; images are OCR'd with `eng`.
 * - commercial (organization): same as license but extracts the 10-digit CR.
 *   (The legacy code only handled PDFs here although the input accepted
 *   images too — images are now processed with the same extraction rules.)
 * - PDF text is read from up to five pages (covers are common); the OCR
 *   fallback still runs on page 1 only and its canvas is size-clamped.
 */
export async function scanDocument(
  file: File,
  kind: ScanKind,
  options?: ScanOptions,
): Promise<OCRResult> {
  const result: OCRResult = {};

  if (isPdfFile(file)) {
    const pdf = await openPdf(file);
    try {
      // Text layer first, across a few pages; OCR only if it is still missing.
      for (const page of pdf.pages) {
        mergeResult(result, extractFromText(page.text, kind));
        assertNotCancelled(options);
        if (isComplete(result, kind)) break;
      }

      if (!isComplete(result, kind)) {
        const scale = kind === 'personal' ? 2.0 : 3.0;
        const dataUrl = await pdf.renderPageDataUrl(1, scale);
        assertNotCancelled(options);
        const ocrText = await recognizeText(dataUrl, kind === 'personal' ? 'ara+eng' : 'eng');
        assertNotCancelled(options);
        mergeResult(result, extractFromText(ocrText, kind));
      }
    } finally {
      await pdf.destroy();
    }
    return result;
  }

  if (isImageFile(file)) {
    const dataUrl = await imageFileToDataUrl(file);
    assertNotCancelled(options);
    const ocrText = await recognizeText(dataUrl, kind === 'personal' ? 'ara+eng' : 'eng');
    assertNotCancelled(options);
    return extractFromText(ocrText, kind);
  }

  // Unsupported file type: nothing extracted (legacy behavior — fields stay empty).
  return result;
}

function hasPrimaryNumber(result: OCRResult, kind: ScanKind): boolean {
  return kind === 'commercial' ? Boolean(result.crNumber) : Boolean(result.license);
}

/** True when no OCR fallback is needed for this document kind. */
function isComplete(result: OCRResult, kind: ScanKind): boolean {
  return kind === 'personal' ? isPersonalComplete(result) : hasPrimaryNumber(result, kind);
}

function extractFromText(text: string, kind: ScanKind): OCRResult {
  if (kind === 'personal') {
    const info = extractPersonalInfo(text);
    return { name: info.name, nationalId: info.nationalId, phone: info.phone };
  }
  if (kind === 'license') {
    const info = extractLicenseInfo(text);
    return { license: info.license, issueDate: info.issueDate };
  }
  return { crNumber: extractCrNumber(text) };
}
