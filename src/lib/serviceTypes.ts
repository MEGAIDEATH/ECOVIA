/**
 * The service catalogue a facility can request (multi-select on the request
 * form). Stored as the PostgreSQL enum `service_type` (an array column on
 * `service_requests`), so only these keys can ever reach the database.
 *
 * Kept dependency-free: imported by the Drizzle schema, server code and
 * client components alike.
 */
export const SERVICE_TYPES = [
  {
    key: 'activity_classification',
    ar: 'خدمة تصنيف النشاط البيئي',
    en: 'Environmental Activity Classification Service',
  },
  {
    key: 'construction_permit_category1',
    ar: 'خدمة إصدار التصريح البيئي للإنشاء — الفئة الأولى',
    en: 'Category 1 Construction Environmental Permit Issuance Service',
  },
  {
    key: 'operational_permit_category1',
    ar: 'خدمة إصدار التصريح البيئي للتشغيل — الفئة الأولى',
    en: 'Category 1 Operational Environmental Permit Issuance Service',
  },
  {
    key: 'environmental_management_plan',
    ar: 'خدمة خطة الإدارة البيئية',
    en: 'Environmental Management Plan Service',
  },
] as const;

export type ServiceTypeKey = (typeof SERVICE_TYPES)[number]['key'];

export const SERVICE_TYPE_KEYS = SERVICE_TYPES.map((type) => type.key) as [ServiceTypeKey, ...ServiceTypeKey[]];

const BY_KEY = new Map<string, (typeof SERVICE_TYPES)[number]>(SERVICE_TYPES.map((type) => [type.key, type]));

export function isServiceTypeKey(value: unknown): value is ServiceTypeKey {
  return typeof value === 'string' && BY_KEY.has(value);
}

export function serviceTypeLabel(key: string): string {
  return BY_KEY.get(key)?.ar ?? key;
}

/**
 * Validates a submitted selection: at least one known key, no duplicates.
 * Returns the normalized list (catalogue order) or null when invalid.
 */
export function parseServiceTypes(values: unknown): ServiceTypeKey[] | null {
  const list = Array.isArray(values) ? values : values === undefined || values === null ? [] : [values];
  if (list.length === 0 || list.length > SERVICE_TYPES.length) return null;
  if (!list.every(isServiceTypeKey)) return null;
  const unique = new Set(list as ServiceTypeKey[]);
  if (unique.size !== list.length) return null;
  return SERVICE_TYPE_KEYS.filter((key) => unique.has(key));
}

/** Human-readable title for a request: its service types, or the legacy free-text name. */
export function requestTitle(request: { serviceTypes?: readonly string[] | null; serviceName?: string | null }): string {
  const types = request.serviceTypes ?? [];
  if (types.length > 0) return types.map(serviceTypeLabel).join('، ');
  return request.serviceName?.trim() || 'طلب خدمة';
}
