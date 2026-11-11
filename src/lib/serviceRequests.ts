/**
 * Shared vocabulary for general service requests — used by the API (server
 * validation) and the UI (form options, labels, category grouping), so both
 * sides always agree.
 */
import type { ServiceRequest, ServiceRequestStatus } from '@/types';

/** The 13 administrative regions of Saudi Arabia (canonical stored values). */
export const SAUDI_REGIONS = [
  'منطقة الرياض',
  'منطقة مكة المكرمة',
  'منطقة المدينة المنورة',
  'منطقة القصيم',
  'المنطقة الشرقية',
  'منطقة عسير',
  'منطقة تبوك',
  'منطقة حائل',
  'منطقة الحدود الشمالية',
  'منطقة جازان',
  'منطقة نجران',
  'منطقة الباحة',
  'منطقة الجوف',
] as const;

export type SaudiRegion = (typeof SAUDI_REGIONS)[number];

export function isSaudiRegion(value: unknown): value is SaudiRegion {
  return typeof value === 'string' && (SAUDI_REGIONS as readonly string[]).includes(value);
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
 * Lifecycle grouping
 * ------------------------------------------------------------------------- */

/**
 * The three request tabs. Every status maps to exactly one category, so a
 * request can never appear twice:
 * - pending  → published, waiting for a specialist
 * - ongoing  → a specialist took it (accepted / in progress)
 * - previous → finished or closed (completed / cancelled / legacy rejected)
 * A specialist's personal decline moves the request to *their* "previous".
 */
export type RequestCategory = 'pending' | 'ongoing' | 'previous';

export const REQUEST_CATEGORIES: ReadonlyArray<{ key: RequestCategory; label: string; empty: string }> = [
  { key: 'pending', label: 'الطلبات المعلقة', empty: 'لا توجد طلبات معلقة.' },
  { key: 'ongoing', label: 'الطلبات الجارية', empty: 'لا توجد طلبات جارية.' },
  { key: 'previous', label: 'الطلبات السابقة', empty: 'لا توجد طلبات سابقة.' },
];

const STATUS_CATEGORY: Record<ServiceRequestStatus, RequestCategory> = {
  pending: 'pending',
  accepted: 'ongoing',
  in_progress: 'ongoing',
  completed: 'previous',
  cancelled: 'previous',
  rejected: 'previous',
};

export function categorizeRequest(request: Pick<ServiceRequest, 'status' | 'declinedByMe'>): RequestCategory {
  if (request.declinedByMe) return 'previous';
  return STATUS_CATEGORY[request.status] ?? 'previous';
}

export const ONGOING_STATUSES: readonly ServiceRequestStatus[] = ['accepted', 'in_progress'];
