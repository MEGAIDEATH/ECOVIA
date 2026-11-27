/**
 * The 13 administrative regions of Saudi Arabia.
 *
 * - `code` is the stable identifier used in URLs (`?region=riyadh`) and as the
 *   primary key of the `regions` table.
 * - `nameAr` is the canonical stored value: `service_requests.region` and
 *   `specialists.region` are foreign keys to `regions.name_ar` (ON UPDATE
 *   CASCADE), so a label correction propagates without touching rows.
 *
 * The same list is seeded by migration 0006; a test keeps both in sync.
 * Dependency-free so the schema, server and client can all import it.
 */
export const REGIONS = [
  { code: 'riyadh', nameAr: 'منطقة الرياض' },
  { code: 'makkah', nameAr: 'منطقة مكة المكرمة' },
  { code: 'madinah', nameAr: 'منطقة المدينة المنورة' },
  { code: 'qassim', nameAr: 'منطقة القصيم' },
  { code: 'eastern', nameAr: 'المنطقة الشرقية' },
  { code: 'asir', nameAr: 'منطقة عسير' },
  { code: 'tabuk', nameAr: 'منطقة تبوك' },
  { code: 'hail', nameAr: 'منطقة حائل' },
  { code: 'northern_borders', nameAr: 'منطقة الحدود الشمالية' },
  { code: 'jazan', nameAr: 'منطقة جازان' },
  { code: 'najran', nameAr: 'منطقة نجران' },
  { code: 'al_bahah', nameAr: 'منطقة الباحة' },
  { code: 'al_jawf', nameAr: 'منطقة الجوف' },
] as const;

export type Region = (typeof REGIONS)[number];
export type RegionCode = Region['code'];
export type RegionName = Region['nameAr'];

const BY_CODE = new Map<string, Region>(REGIONS.map((region) => [region.code, region]));
const BY_NAME = new Map<string, Region>(REGIONS.map((region) => [region.nameAr, region]));

export function regionByCode(code: string | null | undefined): Region | null {
  return code ? BY_CODE.get(code) ?? null : null;
}

export function regionByName(name: string | null | undefined): Region | null {
  return name ? BY_NAME.get(name) ?? null : null;
}

export function isRegionName(value: unknown): value is RegionName {
  return typeof value === 'string' && BY_NAME.has(value);
}

export function isRegionCode(value: unknown): value is RegionCode {
  return typeof value === 'string' && BY_CODE.has(value);
}
