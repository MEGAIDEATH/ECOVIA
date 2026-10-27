import { describe, expect, it } from 'vitest';

import {
  organizationRegistrationPayloadSchema,
  organizationRegistrationSchema,
  otpSchema,
  specialistRegistrationPayloadSchema,
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
    expect(specialistStep1Schema.safeParse({ ...valid, phone: '' }).success).toBe(false);
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

/**
 * Regression: the register routes used to force the document reference to
 * `undefined` while the schema declared it `.nullable()` (string | null, not
 * undefined). Every registration therefore failed with HTTP 400 and no account
 * could ever be created. The payload must validate exactly as the client sends
 * it, with an explicit `null` when no document was attached.
 */
describe('registration payloads carry a document id (never undefined)', () => {
  const specialistBase = {
    fullName: 'خالد سعيد عبدالله',
    nationalId: '1098765432',
      phone: '0512345678',
    license: 'ELESL-2023-1234',
    issueDate: null,
  };

  const organizationBase = {
    orgName: 'منشأة بيئية',
    crNumber: '1010123456',
    phone: '0512345678',
    orgDesc: 'نبذة عن المنشأة',
  };

  it('accepts a specialist payload without an attached document', () => {
    const result = specialistRegistrationPayloadSchema.safeParse({
      ...specialistBase,
      licenseDocId: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a specialist payload with an uploaded document id', () => {
    const result = specialistRegistrationPayloadSchema.safeParse({
      ...specialistBase,
      licenseDocId: '3f1c2b4a-5d6e-4f70-8a91-2b3c4d5e6f70',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a document reference that is undefined rather than null', () => {
    // Documents the exact regression: `undefined` is not a valid nullable value.
    const result = specialistRegistrationPayloadSchema.safeParse({
      ...specialistBase,
      licenseDocId: undefined,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-uuid document reference', () => {
    const result = specialistRegistrationPayloadSchema.safeParse({
      ...specialistBase,
      licenseDocId: 'https://example.com/file.pdf',
    });
    expect(result.success).toBe(false);
  });

  it('accepts an organization payload without an attached document', () => {
    const result = organizationRegistrationPayloadSchema.safeParse({
      ...organizationBase,
      crDocId: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts an organization payload with an uploaded document id', () => {
    const result = organizationRegistrationPayloadSchema.safeParse({
      ...organizationBase,
      crDocId: '3f1c2b4a-5d6e-4f70-8a91-2b3c4d5e6f70',
    });
    expect(result.success).toBe(true);
  });
});