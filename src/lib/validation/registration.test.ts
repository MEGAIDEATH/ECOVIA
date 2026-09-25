import { describe, expect, it } from 'vitest';

import {
  organizationRegistrationSchema,
  otpSchema,
  specialistStep1Schema,
  specialistStep2Schema,
} from './registration';

describe('specialistStep1Schema', () => {
  const valid = {
    fullName: 'خالد سعيد عبدالله',
    nationalId: '1098765432',
    email: 'test@example.com',
    phone: '0512345678',
  };

  it('accepts a complete valid payload', () => {
    expect(specialistStep1Schema.safeParse(valid).success).toBe(true);
  });

  it('rejects missing full name with Arabic message', () => {
    const result = specialistStep1Schema.safeParse({ ...valid, fullName: '   ' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('الاسم الثلاثي مطلوب');
    }
  });

  it('rejects missing national id / email / phone', () => {
    expect(specialistStep1Schema.safeParse({ ...valid, nationalId: '' }).success).toBe(false);
    expect(specialistStep1Schema.safeParse({ ...valid, email: '' }).success).toBe(false);
    expect(specialistStep1Schema.safeParse({ ...valid, phone: '' }).success).toBe(false);
  });

  it('rejects malformed emails', () => {
    const result = specialistStep1Schema.safeParse({ ...valid, email: 'not-an-email' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('البريد الإلكتروني غير صالح');
    }
  });
});

describe('specialistStep2Schema', () => {
  it('requires the license number', () => {
    expect(specialistStep2Schema.safeParse({ license: '', issueDate: '' }).success).toBe(false);
    expect(specialistStep2Schema.safeParse({ license: 'ELESL-2023-1' }).success).toBe(true);
  });

  it('keeps the issue date optional (legacy behavior)', () => {
    expect(specialistStep2Schema.safeParse({ license: 'ELESL-2023-1' }).success).toBe(true);
    expect(
      specialistStep2Schema.safeParse({ license: 'ELESL-2023-1', issueDate: '2024-06-15' })
        .success,
    ).toBe(true);
  });
});

describe('organizationRegistrationSchema', () => {
  const valid = {
    crNumber: '1010123456',
    orgName: 'شركة التقنية البيئية المحدودة',
    phone: '0512345678',
    orgDesc: 'شركة متخصصة في الاستشارات البيئية.',
  };

  it('accepts a complete payload', () => {
    expect(organizationRegistrationSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects each missing field with Arabic messages', () => {
    const cases: Array<[string, string]> = [
      ['crNumber', 'رقم السجل التجاري مطلوب'],
      ['orgName', 'اسم المنشأة مطلوب'],
      ['phone', 'رقم التواصل مطلوب'],
      ['orgDesc', 'نبذة عن الجهة مطلوبة'],
    ];
    for (const [field, message] of cases) {
      const result = organizationRegistrationSchema.safeParse({ ...valid, [field]: '  ' });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues[0].message).toBe(message);
    }
  });
});

describe('otpSchema', () => {
  it('accepts exactly six digits', () => {
    expect(otpSchema.safeParse({ code: '123456' }).success).toBe(true);
  });

  it('rejects short or non-digit codes with the Arabic message', () => {
    for (const code of ['12345', '1234567', 'abcdef']) {
      const result = otpSchema.safeParse({ code });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('أدخل رمز التحقق المكون من 6 أرقام');
      }
    }
  });
});