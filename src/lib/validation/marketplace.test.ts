import { describe, expect, it } from 'vitest';

import { SERVICE_TYPES, parseServiceTypes, requestTitle } from '@/lib/serviceTypes';

import { parseContractInput, parseOfferInput, parseServiceRequestInput, parseSignature } from './marketplace';

const validRequest = {
  serviceTypes: ['activity_classification'],
  activityDescription: 'مصنع أغذية في الرياض يحتاج تصنيفاً بيئياً.',
  notes: 'الزيارة صباحاً',
  region: 'riyadh',
  city: 'الرياض',
};

describe('service type catalogue', () => {
  it('offers exactly the four required services, in order', () => {
    expect(SERVICE_TYPES.map((type) => type.en)).toEqual([
      'Environmental Activity Classification Service',
      'Category 1 Construction Environmental Permit Issuance Service',
      'Category 1 Operational Environmental Permit Issuance Service',
      'Environmental Management Plan Service',
    ]);
  });
  it('accepts one or several known types and normalizes their order', () => {
    expect(parseServiceTypes(['environmental_management_plan', 'activity_classification'])).toEqual([
      'activity_classification',
      'environmental_management_plan',
    ]);
    expect(parseServiceTypes('construction_permit_category1')).toEqual(['construction_permit_category1']);
  });
  it('rejects empty, unknown and duplicated selections', () => {
    expect(parseServiceTypes([])).toBeNull();
    expect(parseServiceTypes(['price'])).toBeNull();
    expect(parseServiceTypes(['activity_classification', 'activity_classification'])).toBeNull();
    expect(parseServiceTypes(undefined)).toBeNull();
  });
  it('titles legacy requests with their free-text name', () => {
    expect(requestTitle({ serviceTypes: [], serviceName: 'خطة ادارة' })).toBe('خطة ادارة');
  });
});

describe('parseServiceRequestInput', () => {
  it('accepts a complete request with activity description and notes', () => {
    const parsed = parseServiceRequestInput(validRequest);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data).toMatchObject({
        serviceTypes: ['activity_classification'],
        notes: 'الزيارة صباحاً',
        regionName: 'منطقة الرياض',
        targetSpecialistId: null,
      });
    }
  });
  it('has no price or duration: legacy fields are ignored, never stored', () => {
    const parsed = parseServiceRequestInput({ ...validRequest, cost: '5000', durationValue: 2, durationUnit: 'week', serviceName: 'x' });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(Object.keys(parsed.data).sort()).toEqual(
        ['activityDescription', 'city', 'notes', 'regionName', 'serviceTypes', 'targetSpecialistId'].sort(),
      );
    }
  });
  it('rejects unsupported service types server-side', () => {
    const parsed = parseServiceRequestInput({ ...validRequest, serviceTypes: ['cleaning'] });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.fieldErrors.serviceTypes).toBeTruthy();
  });
  it('requires an activity description and a canonical region code', () => {
    const parsed = parseServiceRequestInput({ ...validRequest, activityDescription: ' ', region: 'منطقة الرياض' });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.fieldErrors.activityDescription).toBeTruthy();
      expect(parsed.fieldErrors.region).toBeTruthy();
    }
  });
  it('validates the private target id format', () => {
    const parsed = parseServiceRequestInput({ ...validRequest, targetSpecialistId: '1 OR 1=1' });
    expect(parsed.ok).toBe(false);
  });
});

describe('parseOfferInput (execution duration belongs to the offer)', () => {
  it('accepts a positive whole duration within the unit limit', () => {
    expect(parseOfferInput({ durationValue: '3', durationUnit: 'week', message: 'خبرة سابقة' })).toEqual({
      ok: true,
      data: { durationValue: 3, durationUnit: 'week', message: 'خبرة سابقة' },
    });
  });
  it('rejects missing, zero, fractional, absurd or unit-less durations', () => {
    for (const bad of [
      { durationValue: '', durationUnit: 'week' },
      { durationValue: '0', durationUnit: 'day' },
      { durationValue: '1.5', durationUnit: 'month' },
      { durationValue: '-2', durationUnit: 'month' },
      { durationValue: '40', durationUnit: 'month' },
      { durationValue: '2', durationUnit: 'year' },
    ]) {
      expect(parseOfferInput(bad).ok).toBe(false);
    }
  });
});

describe('contract input', () => {
  it('requires a non-negative value and a typed facility signature', () => {
    expect(parseContractInput({ value: '15000', organizationSignature: 'أحمد علي' }).ok).toBe(true);
    expect(parseContractInput({ value: '-1', organizationSignature: 'أحمد علي' }).ok).toBe(false);
    expect(parseContractInput({ value: '100', organizationSignature: 'x' }).ok).toBe(false);
  });
  it('requires a meaningful typed name to sign', () => {
    expect(parseSignature('خالد سعيد')).toBe('خالد سعيد');
    expect(parseSignature(' ')).toBeNull();
    expect(parseSignature('x'.repeat(101))).toBeNull();
  });
});
