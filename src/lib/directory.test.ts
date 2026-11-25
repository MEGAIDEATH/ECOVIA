import { describe, expect, it } from 'vitest';

import { directoryQuery, filterSpecialists, hasActiveFilters, parseDirectoryFilters } from './directory';

const people = [
  { fullName: 'ريم الاختبارية', edu: 'هندسة بيئية', city: 'الرياض', region: 'منطقة الرياض', years: '7' },
  { fullName: 'سالم', edu: 'استشارات استدامة', city: 'الدمام', region: 'المنطقة الشرقية', years: '2' },
  { fullName: 'نورة', edu: 'إدارة بيئية', city: null, region: null, years: null },
];

describe('directory URL filters', () => {
  it('parses, normalizes and bounds every parameter', () => {
    expect(parseDirectoryFilters({ q: '  هندسة   بيئية ', region: 'riyadh', years: '6-10', city: 'الرياض', page: '2' })).toEqual({
      q: 'هندسة بيئية',
      region: 'riyadh',
      years: '6-10',
      city: 'الرياض',
      page: 2,
    });
  });
  it('drops unknown or malicious values instead of trusting them', () => {
    const filters = parseDirectoryFilters({ region: "riyadh' OR 1=1", years: '99', page: '-3', q: 'x'.repeat(200) });
    expect(filters.region).toBeNull();
    expect(filters.years).toBeNull();
    expect(filters.page).toBe(1);
    expect(filters.q).toHaveLength(80);
  });
  it('takes the first value of repeated parameters', () => {
    expect(parseDirectoryFilters({ region: ['eastern', 'riyadh'] }).region).toBe('eastern');
  });
  it('filters by text, region, city and experience consistently', () => {
    expect(filterSpecialists(people, parseDirectoryFilters({ q: 'استدامة' })).map((p) => p.fullName)).toEqual(['سالم']);
    expect(filterSpecialists(people, parseDirectoryFilters({ region: 'riyadh' })).map((p) => p.fullName)).toEqual(['ريم الاختبارية']);
    expect(filterSpecialists(people, parseDirectoryFilters({ years: '0-2' })).map((p) => p.fullName)).toEqual(['سالم']);
    expect(filterSpecialists(people, parseDirectoryFilters({ city: 'الدمام' })).map((p) => p.fullName)).toEqual(['سالم']);
    expect(filterSpecialists(people, parseDirectoryFilters({}))).toHaveLength(3);
  });
  it('round-trips through the query string, keeping filters across pages', () => {
    const filters = parseDirectoryFilters({ q: 'بيئية', region: 'eastern', page: '1' });
    expect(hasActiveFilters(filters)).toBe(true);
    const query = directoryQuery({ ...filters, page: 3 });
    expect(query).toBe(`?q=${encodeURIComponent('بيئية')}&region=eastern&page=3`);
    expect(parseDirectoryFilters(Object.fromEntries(new URLSearchParams(query)))).toMatchObject({ region: 'eastern', page: 3 });
  });
});
