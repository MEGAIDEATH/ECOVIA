import { expect, test } from '@playwright/test';

/**
 * Real pdf.js / Tesseract regressions. Unlike the unit tests (which mock the
 * documentText module), these upload documents in a real browser and let the
 * production build extract fields — covering the worker URL, the text-layer
 * parser and the OCR fallback.
 */

function escapePdfText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/** Minimal multi-page PDF with one line of Helvetica text per page. */
function buildPdf(pages: string[]): Buffer {
  const pageIds = pages.map((_, index) => 3 + index * 2);
  const fontId = 3 + pages.length * 2;
  const objects: string[] = [];

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] =
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] ` +
    `/Count ${pages.length} >>`;

  pages.forEach((text, index) => {
    const pageId = pageIds[index];
    const contentId = pageId + 1;
    const stream = `BT /F1 36 Tf 40 760 Td (${escapePdfText(text)}) Tj ET`;
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ` +
      `/Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  objects[fontId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (let id = 1; id <= fontId; id += 1) {
    offsets[id] = Buffer.byteLength(pdf, 'latin1');
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${fontId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= fontId; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${fontId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'latin1');
}

async function openLicenseStep(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/register/specialist/step-2');
  await expect(page.getByTestId('splash-screen')).toBeHidden({ timeout: 8_000 });
}

test.describe('license PDF extraction (real pdf.js)', () => {
  test('extracts the license and issue date from a text PDF', async ({ page }) => {
    await openLicenseStep(page);

    await page.locator('#file_upload').setInputFiles({
      name: 'license.pdf',
      mimeType: 'application/pdf',
      buffer: buildPdf(['ELESL-2023-12345 15/06/2024']),
    });

    await expect(page.getByText('✨ تم الاستخراج بنجاح!')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByLabel('رقم المعاملة / الترخيص')).toHaveValue('ELESL-2023-12345');
    await expect(page.locator('#issue_date')).toHaveValue('2024-06-15');
  });

  test('finds the license on a later page of a multi-page PDF', async ({ page }) => {
    await openLicenseStep(page);

    await page.locator('#file_upload').setInputFiles({
      name: 'license-multipage.pdf',
      mimeType: 'application/pdf',
      buffer: buildPdf(['COVER PAGE', 'ELESL-2024-77777 01/02/2025']),
    });

    await expect(page.getByLabel('رقم المعاملة / الترخيص')).toHaveValue('ELESL-2024-77777');
    await expect(page.locator('#issue_date')).toHaveValue('2025-02-01');
  });

  test('falls back to real OCR for an image-only document', async ({ page }) => {
    test.skip(test.info().project.name !== 'desktop-chromium', 'heavy OCR download runs once');
    test.setTimeout(180_000);
    await openLicenseStep(page);

    // Render a license number to a PNG inside the page, then upload it: the
    // PDF text layer is absent, so this can only succeed through Tesseract.
    const dataUrl = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no 2d context');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 64px monospace';
      ctx.fillText('ELESL-2023-55555', 40, 170);
      return canvas.toDataURL('image/png');
    });

    await page.locator('#file_upload').setInputFiles({
      name: 'license.png',
      mimeType: 'image/png',
      buffer: Buffer.from(dataUrl.split(',')[1], 'base64'),
    });

    await expect(page.getByLabel('رقم المعاملة / الترخيص')).toHaveValue('ELESL-2023-55555', {
      timeout: 150_000,
    });
  });
});
