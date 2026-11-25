import { describe, expect, it } from 'vitest';

import { cvSchema } from './forms';

describe('cvSchema', () => {
  it('requires only the name; every other CV field is optional', () => {
    const empty = { fullName: '', email: '', phone: '', edu: '', city: '', years: '', exp: '', portfolio: '' };
    expect(cvSchema.safeParse(empty).success).toBe(false);
    expect(cvSchema.safeParse({ ...empty, fullName: 'خالد سعيد' }).success).toBe(true);
  });

  it('bounds lengths and the years of experience', () => {
    const base = { fullName: 'خالد', email: '', phone: '', edu: '', city: '', years: '', exp: '', portfolio: '' };
    expect(cvSchema.safeParse({ ...base, years: '12' }).success).toBe(true);
    expect(cvSchema.safeParse({ ...base, years: '120' }).success).toBe(false);
    expect(cvSchema.safeParse({ ...base, years: '5.5' }).success).toBe(false);
    expect(cvSchema.safeParse({ ...base, exp: 'x'.repeat(5001) }).success).toBe(false);
  });

  it('rejects malformed email when provided', () => {
    const base = { fullName: 'خالد', email: '', phone: '', edu: '', city: '', years: '', exp: '', portfolio: '' };
    expect(cvSchema.safeParse({ ...base, email: 'bad-email' }).success).toBe(false);
    expect(cvSchema.safeParse({ ...base, email: 'a@b.co' }).success).toBe(true);
  });

  it('rejects malformed portfolio URL when provided', () => {
    const base = { fullName: 'خالد', email: '', phone: '', edu: '', city: '', years: '', exp: '', portfolio: '' };
    expect(cvSchema.safeParse({ ...base, portfolio: 'linkedin' }).success).toBe(false);
    expect(cvSchema.safeParse({ ...base, portfolio: 'https://linkedin.com/in/x' }).success).toBe(
      true,
    );
  });
});