import { describe, expect, it } from 'vitest';

import {
  REQUEST_CATEGORIES,
  SAUDI_REGIONS,
  categorizeRequest,
  formatCost,
  formatDuration,
  isSaudiRegion,
  parseCost,
  parseDuration,
} from './serviceRequests';
import type { ServiceRequestStatus } from '@/types';

describe('parseCost', () => {
  it('accepts non-negative amounts with up to two decimals', () => {
    expect(parseCost('15000')).toBe(15000);
    expect(parseCost('0')).toBe(0);
    expect(parseCost('99.5')).toBe(99.5);
    expect(parseCost(250)).toBe(250);
  });
  it('rejects negatives, garbage, too many decimals and absurd amounts', () => {
    for (const bad of ['-1', 'abc', '', '1.234', '1e5', ' ', '10,000', '1000000000']) expect(parseCost(bad)).toBeNull();
    expect(parseCost(null)).toBeNull();
  });
});

describe('parseDuration', () => {
  it('accepts positive integers within the unit limit', () => {
    expect(parseDuration('3', 'month')).toEqual({ value: 3, unit: 'month' });
    expect(parseDuration(10, 'day')).toEqual({ value: 10, unit: 'day' });
  });
  it('rejects zero, fractions, unknown units and out-of-range values', () => {
    expect(parseDuration('0', 'week')).toBeNull();
    expect(parseDuration('1.5', 'week')).toBeNull();
    expect(parseDuration('2', 'year')).toBeNull();
    expect(parseDuration('37', 'month')).toBeNull();
  });
});

describe('formatDuration', () => {
  it('uses Arabic number agreement', () => {
    expect(formatDuration(1, 'month')).toBe('شهر واحد');
    expect(formatDuration(2, 'month')).toBe('شهرين');
    expect(formatDuration(3, 'week')).toBe('3 أسابيع');
    expect(formatDuration(15, 'day')).toBe('15 يومًا');
  });
});

describe('regions', () => {
  it('lists the 13 Saudi regions and validates against them', () => {
    expect(SAUDI_REGIONS).toHaveLength(13);
    expect(isSaudiRegion('منطقة الرياض')).toBe(true);
    expect(isSaudiRegion('الرياض')).toBe(false);
    expect(isSaudiRegion(undefined)).toBe(false);
  });
});

describe('categorizeRequest', () => {
  const expected: Record<ServiceRequestStatus, string> = {
    pending: 'pending',
    accepted: 'ongoing',
    in_progress: 'ongoing',
    completed: 'previous',
    cancelled: 'previous',
    rejected: 'previous',
  };
  it('maps every status to exactly one category', () => {
    for (const [status, category] of Object.entries(expected)) {
      expect(categorizeRequest({ status: status as ServiceRequestStatus })).toBe(category);
    }
    expect(REQUEST_CATEGORIES.map((c) => c.key)).toEqual(['pending', 'ongoing', 'previous']);
  });
  it("puts a specialist's personal decline in their previous requests", () => {
    expect(categorizeRequest({ status: 'pending', declinedByMe: true })).toBe('previous');
  });
});

describe('formatCost', () => {
  it('shows an explicit label for legacy requests without a cost', () => {
    expect(formatCost(null)).toBe('غير محددة');
    expect(formatCost(1500)).toContain('ريال');
  });
});
