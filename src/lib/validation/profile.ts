import { regionByCode } from '@/lib/regions';
import { isUuid } from '@/lib/utils/ids';

import type { FieldErrors, Parsed } from './marketplace';

/**
 * Server-side validation for the self-service profile forms (allowed for
 * pending accounts too: they maintain their own data while waiting).
 */

export const BUSINESS_FIELDS_MAX = 10;
export const BUSINESS_FIELD_MAX_LENGTH = 60;

/** Normalizes field-of-business tags: trimmed, de-duplicated (case-insensitive), bounded. */
export function normalizeBusinessFields(values: unknown[]): string[] | null {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (typeof value !== 'string') return null;
    const tag = value.replace(/\s+/g, ' ').trim();
    if (!tag) continue;
    if (tag.length > BUSINESS_FIELD_MAX_LENGTH) return null;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
  }
  return result.length <= BUSINESS_FIELDS_MAX ? result : null;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export type ImageChange = { kind: 'keep' } | { kind: 'set'; id: string } | { kind: 'remove' };

export interface OrganizationProfileInput {
  phone: string;
  orgDesc: string;
  businessFields: string[];
  website: string | null;
  image: ImageChange;
}

export function parseImageChange(raw: unknown): ImageChange | null {
  if (raw === undefined || raw === null || raw === '' || raw === 'keep') return { kind: 'keep' };
  if (raw === 'remove') return { kind: 'remove' };
  return isUuid(raw) ? { kind: 'set', id: raw } : null;
}

export function parseOrganizationProfileInput(raw: {
  phone: unknown;
  orgDesc: unknown;
  businessFields: unknown[];
  website: unknown;
  profileImageId: unknown;
}): Parsed<OrganizationProfileInput> {
  const fieldErrors: FieldErrors = {};
  const phone = typeof raw.phone === 'string' ? raw.phone.trim() : '';
  if (!/^\+?[0-9 ]{7,20}$/.test(phone)) fieldErrors.phone = 'أدخل رقم تواصل صحيحاً (أرقام فقط).';

  const orgDesc = typeof raw.orgDesc === 'string' ? raw.orgDesc.trim() : '';
  if (orgDesc.length < 5) fieldErrors.orgDesc = 'اكتب نبذة عن المنشأة (5 أحرف على الأقل).';
  else if (orgDesc.length > 2000) fieldErrors.orgDesc = 'النبذة أطول من 2000 حرف.';

  const businessFields = normalizeBusinessFields(raw.businessFields);
  if (!businessFields) {
    fieldErrors.businessFields = `حتى ${BUSINESS_FIELDS_MAX} مجالات، كل مجال حتى ${BUSINESS_FIELD_MAX_LENGTH} حرفاً.`;
  }

  const websiteRaw = typeof raw.website === 'string' ? raw.website.trim() : '';
  if (websiteRaw && (websiteRaw.length > 300 || !isHttpUrl(websiteRaw))) {
    fieldErrors.website = 'أدخل رابطاً يبدأ بـ https://';
  }

  const image = parseImageChange(raw.profileImageId);
  if (!image) fieldErrors.profileImageId = 'صورة الشعار غير صالحة.';

  if (Object.keys(fieldErrors).length > 0 || !businessFields || !image) {
    return { ok: false, error: 'راجع الحقول المظللة.', fieldErrors };
  }
  return { ok: true, data: { phone, orgDesc, businessFields, website: websiteRaw || null, image } };
}

/** `?region=` / form value → canonical region name; '' clears it; unknown → undefined (invalid). */
export function parseOptionalRegion(raw: unknown): string | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || raw === '') return null;
  const region = typeof raw === 'string' ? regionByCode(raw) : null;
  return region ? region.nameAr : undefined;
}
