import { z } from 'zod';

import { regionByCode } from '@/lib/regions';
import { DURATION_LIMITS, DURATION_UNITS, parseCost, type DurationUnit } from '@/lib/serviceRequests';
import { parseServiceTypes, type ServiceTypeKey } from '@/lib/serviceTypes';
import { isUuid } from '@/lib/utils/ids';

/**
 * Server-side validation for the marketplace forms. Shared by the Server
 * Actions (FormData) and the JSON Route Handlers so both entry points accept
 * exactly the same input.
 *
 * The facility's request form deliberately has NO price and NO duration: the
 * time needed belongs to each specialist's offer. Unknown keys (including the
 * legacy `cost`, `durationValue`, `serviceName`) are ignored and never stored.
 */

export type FieldErrors = Partial<Record<string, string>>;

export type Parsed<T> = { ok: true; data: T } | { ok: false; error: string; fieldErrors: FieldErrors };

const trimmed = (max: number) => z.string().trim().max(max);

export interface ServiceRequestInput {
  serviceTypes: ServiceTypeKey[];
  activityDescription: string;
  notes: string | null;
  regionName: string;
  city: string | null;
  /** Set for private requests (validated against approved specialists by the caller). */
  targetSpecialistId: string | null;
}

export const ACTIVITY_DESCRIPTION_MAX = 5000;
export const NOTES_MAX = 2000;

const requestSchema = z.object({
  serviceTypes: z.unknown(),
  activityDescription: trimmed(ACTIVITY_DESCRIPTION_MAX + 1),
  notes: trimmed(NOTES_MAX + 1).optional(),
  region: z.string().trim().optional(),
  city: trimmed(101).optional(),
  targetSpecialistId: z.string().trim().optional(),
});

export function parseServiceRequestInput(raw: Record<string, unknown>): Parsed<ServiceRequestInput> {
  const result = requestSchema.safeParse({
    serviceTypes: raw.serviceTypes,
    activityDescription: typeof raw.activityDescription === 'string' ? raw.activityDescription : '',
    notes: typeof raw.notes === 'string' ? raw.notes : undefined,
    region: typeof raw.region === 'string' ? raw.region : undefined,
    city: typeof raw.city === 'string' ? raw.city : undefined,
    targetSpecialistId: typeof raw.targetSpecialistId === 'string' ? raw.targetSpecialistId : undefined,
  });
  if (!result.success) return { ok: false, error: 'بيانات الطلب غير صالحة.', fieldErrors: {} };
  const data = result.data;
  const fieldErrors: FieldErrors = {};

  const serviceTypes = parseServiceTypes(data.serviceTypes);
  if (!serviceTypes) fieldErrors.serviceTypes = 'اختر نوع خدمة واحداً على الأقل من القائمة.';

  if (data.activityDescription.length < 5) fieldErrors.activityDescription = 'صف النشاط المطلوب (5 أحرف على الأقل).';
  else if (data.activityDescription.length > ACTIVITY_DESCRIPTION_MAX)
    fieldErrors.activityDescription = `وصف النشاط أطول من ${ACTIVITY_DESCRIPTION_MAX} حرف.`;

  if ((data.notes?.length ?? 0) > NOTES_MAX) fieldErrors.notes = `الملاحظات أطول من ${NOTES_MAX} حرف.`;
  if ((data.city?.length ?? 0) > 100) fieldErrors.city = 'اسم المدينة طويل جداً.';

  const region = regionByCode(data.region);
  if (!region) fieldErrors.region = 'اختر منطقة صحيحة من القائمة.';

  const target = data.targetSpecialistId || null;
  if (target && !isUuid(target)) fieldErrors.targetSpecialistId = 'الأخصائي المحدد غير صالح.';

  if (Object.keys(fieldErrors).length > 0 || !serviceTypes || !region) {
    return { ok: false, error: 'راجع الحقول المظللة.', fieldErrors };
  }
  return {
    ok: true,
    data: {
      serviceTypes,
      activityDescription: data.activityDescription,
      notes: data.notes ? data.notes : null,
      regionName: region.nameAr,
      city: data.city ? data.city : null,
      targetSpecialistId: target,
    },
  };
}

export interface OfferInput {
  durationValue: number;
  durationUnit: DurationUnit;
  message: string | null;
}

export const OFFER_MESSAGE_MAX = 2000;

export function parseOfferInput(raw: Record<string, unknown>): Parsed<OfferInput> {
  const fieldErrors: FieldErrors = {};
  const unit = typeof raw.durationUnit === 'string' ? raw.durationUnit : '';
  const validUnit = (DURATION_UNITS as readonly string[]).includes(unit) ? (unit as DurationUnit) : null;
  if (!validUnit) fieldErrors.durationUnit = 'اختر وحدة المدة.';

  const rawValue = typeof raw.durationValue === 'number' ? String(raw.durationValue) : String(raw.durationValue ?? '').trim();
  const value = /^\d{1,4}$/.test(rawValue) ? Number(rawValue) : NaN;
  if (!Number.isInteger(value) || value < 1) fieldErrors.durationValue = 'أدخل مدة التنفيذ عدداً صحيحاً أكبر من صفر.';
  else if (validUnit && value > DURATION_LIMITS[validUnit])
    fieldErrors.durationValue = `الحد الأقصى ${DURATION_LIMITS[validUnit]} لهذه الوحدة.`;

  const message = typeof raw.message === 'string' ? raw.message.trim() : '';
  if (message.length > OFFER_MESSAGE_MAX) fieldErrors.message = `الرسالة أطول من ${OFFER_MESSAGE_MAX} حرف.`;

  if (Object.keys(fieldErrors).length > 0 || !validUnit) {
    return { ok: false, error: 'راجع بيانات العرض.', fieldErrors };
  }
  return { ok: true, data: { durationValue: value, durationUnit: validUnit, message: message || null } };
}

export interface ContractInput {
  title: string | null;
  value: string;
  organizationSignature: string;
}

export function parseContractInput(raw: Record<string, unknown>): Parsed<ContractInput> {
  const fieldErrors: FieldErrors = {};
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  if (title.length > 200) fieldErrors.title = 'عنوان العقد طويل جداً.';
  const cost = parseCost(raw.value);
  if (cost === null) fieldErrors.value = 'أدخل قيمة العقد بالريال (رقم غير سالب، حتى منزلتين عشريتين).';
  const signature = typeof raw.organizationSignature === 'string' ? raw.organizationSignature.trim() : '';
  if (signature.length < 2 || signature.length > 100) fieldErrors.organizationSignature = 'اكتب اسم المفوّض بالتوقيع عن المنشأة.';
  if (Object.keys(fieldErrors).length > 0 || cost === null) return { ok: false, error: 'راجع بيانات العقد.', fieldErrors };
  return { ok: true, data: { title: title || null, value: String(cost), organizationSignature: signature } };
}

export function parseSignature(raw: unknown): string | null {
  const signature = typeof raw === 'string' ? raw.trim() : '';
  return signature.length >= 2 && signature.length <= 100 ? signature : null;
}
