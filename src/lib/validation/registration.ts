import { z } from 'zod';

/**
 * Registration validation. Field presence mirrors the legacy HTML `required`
 * attributes; messages are Arabic for accessible inline feedback.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const specialistStep1Schema = z.object({
  fullName: z.string().trim().min(1, 'الاسم الثلاثي مطلوب'),
  nationalId: z.string().trim().min(1, 'رقم الهوية مطلوب'),
  email: z
    .string()
    .trim()
    .min(1, 'البريد الإلكتروني مطلوب')
    .regex(EMAIL_PATTERN, 'البريد الإلكتروني غير صالح'),
  phone: z.string().trim().min(1, 'رقم الجوال مطلوب'),
});

export type SpecialistStep1Values = z.infer<typeof specialistStep1Schema>;

export const specialistStep2Schema = z.object({
  license: z.string().trim().min(1, 'رقم المعاملة / الترخيص مطلوب'),
  /** Optional in the legacy form (`<input type="date">` without `required`). */
  issueDate: z.string().optional(),
});

export type SpecialistStep2Values = z.infer<typeof specialistStep2Schema>;

export const organizationRegistrationSchema = z.object({
  crNumber: z.string().trim().min(1, 'رقم السجل التجاري مطلوب'),
  orgName: z.string().trim().min(1, 'اسم المنشأة مطلوب'),
  phone: z.string().trim().min(1, 'رقم التواصل مطلوب'),
  orgDesc: z.string().trim().min(1, 'نبذة عن الجهة مطلوبة'),
});

export type OrganizationRegistrationValues = z.infer<typeof organizationRegistrationSchema>;

/**
 * Storage download URL of an uploaded document. `null` means the user did not
 * attach a file — registration must still succeed without it.
 */
export const httpUrlSchema = z
  .string()
  .max(2048)
  .url()
  .refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), 'رابط غير صالح');

/**
 * Full specialist registration payload (form fields + optional document URL).
 * Validated client-side before the Firestore write so empty/garbage documents
 * can never reach the database — the same guarantee the removed
 * `/api/registration` route provided.
 */
export const specialistRegistrationPayloadSchema = specialistStep1Schema.extend({
  fullName: z.string().trim().min(1, 'الاسم الثلاثي مطلوب').max(200),
  nationalId: z.string().trim().min(1, 'رقم الهوية مطلوب').max(32),
  email: z
    .string()
    .trim()
    .max(320)
    .regex(EMAIL_PATTERN, 'البريد الإلكتروني غير صالح'),
  phone: z.string().trim().min(1, 'رقم الجوال مطلوب').max(32),
  license: z.string().trim().min(1, 'رقم المعاملة / الترخيص مطلوب').max(120),
  issueDate: z.string().trim().max(40).nullable(),
  licenseDocUrl: httpUrlSchema.nullable(),
});

export type SpecialistRegistrationPayload = z.infer<typeof specialistRegistrationPayloadSchema>;

/** Full organization registration payload (form fields + optional document URL). */
export const organizationRegistrationPayloadSchema = organizationRegistrationSchema.extend({
  crNumber: z.string().trim().min(1, 'رقم السجل التجاري مطلوب').max(32),
  orgName: z.string().trim().min(1, 'اسم المنشأة مطلوب').max(200),
  phone: z.string().trim().min(1, 'رقم التواصل مطلوب').max(32),
  orgDesc: z.string().trim().min(1, 'نبذة عن الجهة مطلوبة').max(2000),
  crDocUrl: httpUrlSchema.nullable(),
});

export type OrganizationRegistrationPayload = z.infer<
  typeof organizationRegistrationPayloadSchema
>;

export const otpSchema = z.object({
  code: z
    .string()
    .regex(/^\d{6}$/, 'أدخل رمز التحقق المكون من 6 أرقام'),
});

export type OtpValues = z.infer<typeof otpSchema>;
