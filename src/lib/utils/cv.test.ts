import { describe, expect, it } from 'vitest';

import { documentIdFromUrl, fileUrl, formatExperienceYears, maskNationalIdForOrganization } from './cv';

describe('protected file helpers', () => {
  const id = '3f1c2b4a-5d6e-4f70-8a91-2b3c4d5e6f70';

  it('builds the protected serving URL for a document id', () => {
    expect(fileUrl(id)).toBe(`/api/files/${id}`);
  });

  it('returns null instead of a URL when there is no document', () => {
    expect(fileUrl(null)).toBeNull();
    expect(fileUrl(undefined)).toBeNull();
    expect(fileUrl('')).toBeNull();
  });

  it('round-trips a serving URL back to its document id', () => {
    // The register/CV flows upload (get a URL) and then persist the id.
    expect(documentIdFromUrl(fileUrl(id))).toBe(id);
  });

  it('has no document id for blob, external, or legacy URLs', () => {
    expect(documentIdFromUrl('blob:http://localhost/abc')).toBeNull();
    expect(documentIdFromUrl('https://example.com/file.pdf')).toBeNull();
    expect(documentIdFromUrl(null)).toBeNull();
    expect(documentIdFromUrl(undefined)).toBeNull();
  });
});

describe('maskNationalIdForOrganization', () => {
  it('masks ids of length >= 10 as first3 + **** + rest-from-index-7 (legacy)', () => {
    expect(maskNationalIdForOrganization('1098765432')).toBe('109****432');
  });

  it('leaves shorter values untouched (legacy guard)', () => {
    expect(maskNationalIdForOrganization('123')).toBe('123');
  });
});

describe('formatExperienceYears', () => {
  it('formats years with the legacy suffix', () => {
    expect(formatExperienceYears('5')).toBe('5 سنوات خبرة');
    expect(formatExperienceYears(7)).toBe('7 سنوات خبرة');
  });

  it('shows the beginner label when empty (legacy)', () => {
    expect(formatExperienceYears(null)).toBe('مبتدئ');
    expect(formatExperienceYears(undefined)).toBe('مبتدئ');
    expect(formatExperienceYears('')).toBe('مبتدئ');
  });
});