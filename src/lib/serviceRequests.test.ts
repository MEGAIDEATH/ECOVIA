import { describe, expect, it } from 'vitest';

import {
  REQUEST_CATEGORIES,
  SAUDI_REGIONS,
  SPECIALIST_TABS,
  categorizeStatus,
  formatCost,
  formatDuration,
  isSaudiRegion,
  parseCost,
  parseDuration,
  parsePage,
  parseRequestCategory,
  parseSpecialistTab,
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

describe('categorizeStatus (facility tabs)', () => {
  const expected: Record<ServiceRequestStatus, string> = {
    pending: 'open',
    accepted: 'contracted',
    in_progress: 'contracted',
    completed: 'previous',
    cancelled: 'previous',
    rejected: 'previous',
  };
  it('maps every status to exactly one tab', () => {
    for (const [status, category] of Object.entries(expected)) {
      expect(categorizeStatus(status as ServiceRequestStatus)).toBe(category);
    }
    expect(REQUEST_CATEGORIES.map((c) => c.key)).toEqual(['open', 'contracted', 'previous']);
  });
});

describe('URL parameter parsing', () => {
  it('normalizes unknown tab values to the default tab', () => {
    expect(parseRequestCategory('contracted')).toBe('contracted');
    expect(parseRequestCategory('<script>')).toBe('open');
    expect(parseRequestCategory(undefined)).toBe('open');
    expect(parseSpecialistTab('offers')).toBe('offers');
    expect(parseSpecialistTab('all')).toBe('open');
    expect(SPECIALIST_TABS.map((t) => t.key)).toEqual(['open', 'offers', 'contracted', 'declined']);
  });
  it('accepts only positive page numbers', () => {
    expect(parsePage('3')).toBe(3);
    expect(parsePage('0')).toBe(1);
    expect(parsePage('-2')).toBe(1);
    expect(parsePage('abc')).toBe(1);
    expect(parsePage(undefined)).toBe(1);
  });
});

describe('formatCost', () => {
  it('shows an explicit label for legacy requests without a cost', () => {
    expect(formatCost(null)).toBe('غير محددة');
    expect(formatCost(1500)).toContain('ريال');
  });
});
