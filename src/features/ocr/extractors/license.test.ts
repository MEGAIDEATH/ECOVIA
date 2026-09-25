import { describe, expect, it } from 'vitest';

import { extractLicenseInfo } from './license';

describe('extractLicenseInfo', () => {
  it('extracts a dashed ELESL license', () => {
    expect(extractLicenseInfo('ELESL-2023-12345').license).toBe('ELESL-2023-12345');
  });

  it('normalizes a compact ELESL license to dashed form', () => {
    expect(extractLicenseInfo('ELESL202312345').license).toBe('ELESL-2023-12345');
  });

  it('normalizes compact forms inside larger text (whitespace removed)', () => {
    expect(extractLicenseInfo('رخصة elesl 2023 99887').license).toBe('ELESL-2023-99887');
  });

  it('returns null license when absent', () => {
    expect(extractLicenseInfo('no license here').license).toBeNull();
  });

  it('extracts a single DD/MM/YYYY date as YYYY-MM-DD', () => {
    expect(extractLicenseInfo('issued 15/06/2024').issueDate).toBe('2024-06-15');
  });

  it('supports DD-MM-YYYY separators', () => {
    expect(extractLicenseInfo('issued 01-02-2023').issueDate).toBe('2023-02-01');
  });

  it('picks the LATEST date when several exist (legacy behavior)', () => {
    const result = extractLicenseInfo('01/01/2020 expiry 31/12/2025 start 15/06/2024');
    expect(result.issueDate).toBe('2025-12-31');
  });

  it('returns null date when none found', () => {
    expect(extractLicenseInfo('ELESL-2023-1').issueDate).toBeNull();
  });

  it('extracts license and date together', () => {
    const result = extractLicenseInfo('ELESL 2024 555 | 05/05/2025');
    expect(result.license).toBe('ELESL-2024-555');
    expect(result.issueDate).toBe('2025-05-05');
  });

  it('does not swallow a following date into the license number', () => {
    const result = extractLicenseInfo('ELESL-2024-77777 01/02/2025');
    expect(result.license).toBe('ELESL-2024-77777');
    expect(result.issueDate).toBe('2025-02-01');
  });

  it('does not swallow a date that directly abuts the license number', () => {
    const result = extractLicenseInfo('ELESL-2024-7777701/02/2025');
    expect(result.license).toBe('ELESL-2024-77777');
    expect(result.issueDate).toBe('2025-02-01');
  });
});