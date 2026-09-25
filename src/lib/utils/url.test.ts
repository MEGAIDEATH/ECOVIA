import { describe, expect, it } from 'vitest';

import { isSafeExternalUrl, safeDownloadUrl, safeExternalUrl, safeImageUrl } from './url';

describe('safeExternalUrl', () => {
  it('allows http(s) URLs', () => {
    expect(isSafeExternalUrl('https://linkedin.com/in/khaled')).toBe(true);
    expect(isSafeExternalUrl('http://example.com/cv.pdf')).toBe(true);
    expect(isSafeExternalUrl('HTTPS://EXAMPLE.COM')).toBe(true);
  });

  it('rejects script-capable and non-http protocols', () => {
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeExternalUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeExternalUrl('vbscript:msgbox(1)')).toBe(false);
    expect(isSafeExternalUrl('//example.com')).toBe(false);
    expect(isSafeExternalUrl('/relative/path')).toBe(false);
    expect(isSafeExternalUrl('not a url')).toBe(false);
    expect(isSafeExternalUrl('')).toBe(false);
    expect(isSafeExternalUrl(null)).toBe(false);
    expect(isSafeExternalUrl(undefined)).toBe(false);
  });

  it('returns the URL only when it is safe', () => {
    expect(safeExternalUrl('https://example.com/cv.pdf')).toBe('https://example.com/cv.pdf');
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(safeExternalUrl(null)).toBeNull();
  });

  it('allows only raster image data URLs and PDF data URLs in the appropriate sinks', () => {
    const image = 'data:image/png;base64,YWJj';
    const pdf = 'data:application/pdf;base64,YWJj';
    expect(safeImageUrl(image)).toBe(image);
    expect(safeImageUrl('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=')).toBeNull();
    expect(safeDownloadUrl(pdf)).toBe(pdf);
    expect(safeDownloadUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(safeImageUrl('javascript:alert(1)')).toBeNull();
    expect(safeDownloadUrl('javascript:alert(1)')).toBeNull();
  });
});
