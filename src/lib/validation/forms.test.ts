import { describe, expect, it } from 'vitest';

import { contractSchema, cvSchema } from './forms';

describe('contractSchema', () => {
  const valid = { title: 'مسح بيئي', duration: 'شهرين', value: '15000', orgSig: 'أحمد' };

  it('accepts a complete contract', () => {
    expect(contractSchema.safeParse(valid).success).toBe(true);
  });

  it('requires every field (legacy required attributes)', () => {
    expect(contractSchema.safeParse({ ...valid, title: '' }).success).toBe(false);
    expect(contractSchema.safeParse({ ...valid, duration: ' ' }).success).toBe(false);
    expect(contractSchema.safeParse({ ...valid, value: '' }).success).toBe(false);
    expect(contractSchema.safeParse({ ...valid, orgSig: '' }).success).toBe(false);
    expect(contractSchema.safeParse({}).success).toBe(false);
  });
});

describe('cvSchema', () => {
  it('accepts empty optional CV data (legacy had no required fields)', () => {
    const empty = { fullName: '', email: '', phone: '', edu: '', years: '', exp: '', portfolio: '' };
    expect(cvSchema.safeParse(empty).success).toBe(true);
  });

  it('rejects malformed email when provided', () => {
    const base = { fullName: 'خالد', email: '', phone: '', edu: '', years: '', exp: '', portfolio: '' };
    expect(cvSchema.safeParse({ ...base, email: 'bad-email' }).success).toBe(false);
    expect(cvSchema.safeParse({ ...base, email: 'a@b.co' }).success).toBe(true);
  });

  it('rejects malformed portfolio URL when provided', () => {
    const base = { fullName: 'خالد', email: '', phone: '', edu: '', years: '', exp: '', portfolio: '' };
    expect(cvSchema.safeParse({ ...base, portfolio: 'linkedin' }).success).toBe(false);
    expect(cvSchema.safeParse({ ...base, portfolio: 'https://linkedin.com/in/x' }).success).toBe(
      true,
    );
  });
});