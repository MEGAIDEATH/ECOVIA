import { describe, expect, it } from 'vitest';

import { normalizeBusinessFields, parseImageChange, parseOptionalRegion, parseOrganizationProfileInput } from './profile';

const valid = {
  phone: '0551234567',
  orgDesc: 'مصنع مواد غذائية',
  businessFields: ['صناعات غذائية', 'تعبئة وتغليف'],
  website: 'https://example.com',
  profileImageId: 'keep',
};

describe('facility profile validation', () => {
  it('accepts a complete profile', () => {
    expect(parseOrganizationProfileInput(valid).ok).toBe(true);
  });
  it('normalizes, de-duplicates and bounds fields of business', () => {
    expect(normalizeBusinessFields(['  صناعة ', 'صناعة', '', 'Retail', 'retail'])).toEqual(['صناعة', 'Retail']);
    expect(normalizeBusinessFields(Array.from({ length: 11 }, (_, i) => `مجال ${i}`))).toBeNull();
    expect(normalizeBusinessFields(['x'.repeat(61)])).toBeNull();
  });
  it('only accepts http(s) websites', () => {
    expect(parseOrganizationProfileInput({ ...valid, website: 'javascript:alert(1)' }).ok).toBe(false);
    expect(parseOrganizationProfileInput({ ...valid, website: '' }).ok).toBe(true);
  });
  it('validates the logo reference', () => {
    expect(parseImageChange('keep')).toEqual({ kind: 'keep' });
    expect(parseImageChange('remove')).toEqual({ kind: 'remove' });
    expect(parseImageChange('0f3d3600-2e7d-4733-8fbf-af0000000001')).toEqual({
      kind: 'set',
      id: '0f3d3600-2e7d-4733-8fbf-af0000000001',
    });
    expect(parseImageChange('../etc/passwd')).toBeNull();
  });
  it('maps region codes and rejects unknown regions', () => {
    expect(parseOptionalRegion('eastern')).toBe('المنطقة الشرقية');
    expect(parseOptionalRegion('')).toBeNull();
    expect(parseOptionalRegion('mars')).toBeUndefined();
  });
});
