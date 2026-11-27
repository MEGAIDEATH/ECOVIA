/**
 * Shared vocabulary for service requests — used by the server (validation)
 * and the UI (labels, tab grouping), so both sides always agree.
 */
import { REGIONS, isRegionName, type RegionName } from '@/lib/regions';
import type { ServiceRequestStatus } from '@/types';

/** The 13 administrative regions (canonical stored names; see src/lib/regions.ts). */
export const SAUDI_REGIONS: readonly RegionName[] = REGIONS.map((region) => region.nameAr);

export type SaudiRegion = RegionName;

export function isSaudiRegion(value: unknown): value is SaudiRegion {
  return isRegionName(value);
}

export const DURATION_UNITS = ['day', 'week', 'month'] as const;
export type DurationUnit = (typeof DURATION_UNITS)[number];

/** Upper bounds keep durations realistic (≈ 3 years). */
export const DURATION_LIMITS: Record<DurationUnit, number> = { day: 1095, week: 156, month: 36 };

export const DURATION_UNIT_LABELS: Record<DurationUnit, string> = { day: 'يوم', week: 'أسبوع', month: 'شهر' };

/** Arabic duration label with correct number agreement (e.g. "3 أشهر", "شهرين"). */
export function formatDuration(value: number, unit: DurationUnit): string {
  const forms: Record<DurationUnit, [one: string, two: string, few: string, many: string]> = {
    day: ['يوم واحد', 'يومين', 'أيام', 'يومًا'],
    week: ['أسبوع واحد', 'أسبوعين', 'أسابيع', 'أسبوعًا'],
    month: ['شهر واحد', 'شهرين', 'أشهر', 'شهرًا'],
  };
  const [one, two, few, many] = forms[unit];
  if (value === 1) return one;
  if (value === 2) return two;
  if (value >= 3 && value <= 10) return `${value} ${few}`;
  return `${value} ${many}`;
}

export const MAX_SERVICE_COST = 100_000_000;

/** Parses a non-negative SAR amount with at most two decimals; null if invalid. */
export function parseCost(value: unknown): number | null {
  const text = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : '';
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(text)) return null;
  const amount = Number(text);
  return Number.isFinite(amount) && amount >= 0 && amount <= MAX_SERVICE_COST ? amount : null;
}

export function formatCost(cost: number | null | undefined): string {
  if (cost === null || cost === undefined) return 'غير محددة';
  return `${new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 }).format(cost)} ريال`;
}

/** Validates a structured duration; returns null when invalid. */
export function parseDuration(value: unknown, unit: unknown): { value: number; unit: DurationUnit } | null {
  if (typeof unit !== 'string' || !(DURATION_UNITS as readonly string[]).includes(unit)) return null;
  const n = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value) : NaN;
  const u = unit as DurationUnit;
  return Number.isInteger(n) && n >= 1 && n <= DURATION_LIMITS[u] ? { value: n, unit: u } : null;
}

/* ---------------------------------------------------------------------------
 * Lifecycle grouping (facility request list tabs, kept in `?tab=`)
 * ------------------------------------------------------------------------- */

/**
 * Every status maps to exactly one tab, so a request never appears twice:
 * - open       → published, accepting offers (may have a contract awaiting signature)
 * - contracted → a contract was signed (accepted / in progress)
 * - previous   → finished or closed (completed / cancelled / legacy rejected)
 */
export type RequestCategory = 'open' | 'contracted' | 'previous';

export const REQUEST_CATEGORIES: ReadonlyArray<{ key: RequestCategory; label: string; empty: string }> = [
  { key: 'open', label: 'مفتوحة للعروض', empty: 'لا توجد طلبات مفتوحة.' },
  { key: 'contracted', label: 'متعاقد عليها', empty: 'لا توجد طلبات متعاقد عليها.' },
  { key: 'previous', label: 'السابقة', empty: 'لا توجد طلبات سابقة.' },
];

export const CATEGORY_STATUSES: Record<RequestCategory, readonly ServiceRequestStatus[]> = {
  open: ['pending'],
  contracted: ['accepted', 'in_progress'],
  previous: ['completed', 'cancelled', 'rejected'],
};

export function categorizeStatus(status: ServiceRequestStatus): RequestCategory {
  if (CATEGORY_STATUSES.open.includes(status)) return 'open';
  if (CATEGORY_STATUSES.contracted.includes(status)) return 'contracted';
  return 'previous';
}

export function parseRequestCategory(value: unknown): RequestCategory {
  return value === 'contracted' || value === 'previous' ? value : 'open';
}

export const ONGOING_STATUSES: readonly ServiceRequestStatus[] = ['accepted', 'in_progress'];

/** Specialist discovery tabs (`/specialist/requests?tab=`). */
export type SpecialistRequestTab = 'open' | 'offers' | 'contracted' | 'declined';

export const SPECIALIST_TABS: ReadonlyArray<{ key: SpecialistRequestTab; label: string; empty: string }> = [
  { key: 'open', label: 'متاحة لتقديم عرض', empty: 'لا توجد طلبات متاحة حالياً.' },
  { key: 'offers', label: 'عروضي', empty: 'لم تقدّم أي عرض بعد.' },
  { key: 'contracted', label: 'تعاقداتي', empty: 'لا توجد تعاقدات بعد.' },
  { key: 'declined', label: 'اعتذرت عنها', empty: 'لم تعتذر عن أي طلب.' },
];

export function parseSpecialistTab(value: unknown): SpecialistRequestTab {
  return value === 'offers' || value === 'contracted' || value === 'declined' ? value : 'open';
}

/** `?page=` → 1-based page number (invalid values fall back to 1). */
export function parsePage(value: unknown): number {
  const n = typeof value === 'string' && /^\d{1,4}$/.test(value) ? Number(value) : 1;
  return n >= 1 ? n : 1;
}

export const PAGE_SIZE = 20;
