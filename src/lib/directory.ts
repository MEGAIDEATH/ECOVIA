/**
 * Competency-directory filters, carried in the URL
 * (`/organization/specialists?q=&region=&years=&city=&page=`). Parsing
 * normalizes and bounds every value; filtering is a pure function so the
 * server-rendered results and the controls always agree.
 */
import { regionByCode } from '@/lib/regions';

export const YEARS_BUCKETS = [
  { value: '0-2', label: '0–2 سنوات', min: 0, max: 2 },
  { value: '3-5', label: '3–5 سنوات', min: 3, max: 5 },
  { value: '6-10', label: '6–10 سنوات', min: 6, max: 10 },
  { value: '11+', label: 'أكثر من 10 سنوات', min: 11, max: Number.POSITIVE_INFINITY },
] as const;

export type YearsBucket = (typeof YEARS_BUCKETS)[number]['value'];

export interface DirectoryFilters {
  q: string;
  /** Region code (validated). */
  region: string | null;
  years: YearsBucket | null;
  city: string;
  page: number;
}

export const DIRECTORY_PAGE_SIZE = 24;

type Raw = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? '';
const clean = (value: string, max: number) => value.replace(/\s+/g, ' ').trim().slice(0, max);

export function parseDirectoryFilters(raw: Raw): DirectoryFilters {
  const region = regionByCode(one(raw.region))?.code ?? null;
  const yearsValue = one(raw.years);
  const years = YEARS_BUCKETS.find((bucket) => bucket.value === yearsValue)?.value ?? null;
  const pageValue = one(raw.page);
  const page = /^\d{1,4}$/.test(pageValue) && Number(pageValue) >= 1 ? Number(pageValue) : 1;
  return { q: clean(one(raw.q), 80), region, years, city: clean(one(raw.city), 60), page };
}

export function hasActiveFilters(filters: DirectoryFilters): boolean {
  return Boolean(filters.q || filters.region || filters.years || filters.city);
}

/** Query string for a filter set (empty values and page 1 dropped). */
export function directoryQuery(filters: Partial<DirectoryFilters>): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.region) params.set('region', filters.region);
  if (filters.years) params.set('years', filters.years);
  if (filters.city) params.set('city', filters.city);
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));
  const query = params.toString();
  return query ? `?${query}` : '';
}

export interface DirectoryEntry {
  fullName: string;
  edu?: string | null;
  city?: string | null;
  region?: string | null;
  years?: string | number | null;
}

function parseYears(value: DirectoryEntry['years']): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : null;
}

export function filterSpecialists<T extends DirectoryEntry>(list: T[], filters: DirectoryFilters): T[] {
  const q = filters.q.toLowerCase();
  const city = filters.city.toLowerCase();
  const regionName = filters.region ? regionByCode(filters.region)?.nameAr ?? null : null;
  const bucket = YEARS_BUCKETS.find((entry) => entry.value === filters.years);
  return list.filter((spec) => {
    if (q && !`${spec.fullName ?? ''} ${spec.edu ?? ''}`.toLowerCase().includes(q)) return false;
    if (city && (spec.city ?? '').toLowerCase() !== city) return false;
    if (regionName && spec.region !== regionName) return false;
    if (bucket) {
      const n = parseYears(spec.years);
      if (n === null || n < bucket.min || n > bucket.max) return false;
    }
    return true;
  });
}
