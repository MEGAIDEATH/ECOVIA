import { describe, expect, it } from 'vitest';

import { extractCrNumber } from './cr';

describe('extractCrNumber', () => {
  it('extracts the first 10-digit run as the CR number', () => {
    expect(extractCrNumber('Commercial Registration 1010123456 issued 2020')).toBe('1010123456');
  });

  it('ignores embedded whitespace (legacy normalization)', () => {
    expect(extractCrNumber('CR\n10 10 123456')).toBe('1010123456');
  });

  it('returns null when no 10-digit number exists', () => {
    expect(extractCrNumber('CR 123456789')).toBeNull();
  });

  it('returns null for empty text', () => {
    expect(extractCrNumber('')).toBeNull();
  });
});