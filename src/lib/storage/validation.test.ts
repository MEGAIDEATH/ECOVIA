import { describe, expect, it } from 'vitest';

import { detectFileType, isUploadKind, MAX_UPLOAD_BYTES, validateUpload } from './validation';

const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0]);
const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]);
const html = new TextEncoder().encode('<html><script>alert(1)</script>');

describe('detectFileType', () => {
  it('recognises supported signatures and rejects others', () => {
    expect(detectFileType(pdf)).toBe('application/pdf');
    expect(detectFileType(png)).toBe('image/png');
    expect(detectFileType(jpeg)).toBe('image/jpeg');
    expect(detectFileType(webp)).toBe('image/webp');
    expect(detectFileType(html)).toBeNull();
  });
});

describe('validateUpload', () => {
  it('accepts a PDF resume and derives the extension from content', () => {
    expect(validateUpload('resume', pdf)).toEqual({ ok: true, type: 'application/pdf', extension: 'pdf' });
  });

  it('rejects content that does not match the document kind', () => {
    expect(validateUpload('resume', png).ok).toBe(false);
    expect(validateUpload('profile_image', pdf).ok).toBe(false);
    expect(validateUpload('license', html).ok).toBe(false);
  });

  it('accepts images or PDFs for verification documents', () => {
    expect(validateUpload('commercial_registration', jpeg).ok).toBe(true);
    expect(validateUpload('license', pdf).ok).toBe(true);
  });

  it('enforces the size limit and rejects empty files', () => {
    const big = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    big.set(pdf);
    expect(validateUpload('resume', big).ok).toBe(false);
    expect(validateUpload('resume', new Uint8Array()).ok).toBe(false);
  });
});

describe('isUploadKind', () => {
  it('only allows known document kinds', () => {
    expect(isUploadKind('resume')).toBe(true);
    expect(isUploadKind('commercial')).toBe(false);
    expect(isUploadKind('../etc')).toBe(false);
  });
});
