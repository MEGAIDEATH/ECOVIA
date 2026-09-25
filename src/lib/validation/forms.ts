import { z } from 'zod';

/**
 * Dashboard form validation.
 * - CV: the legacy editor had no `required` fields, so everything stays
 *   optional; only format checks apply when a value is present.
 * - Contract: all four fields were `required` in the legacy modal.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const optionalEmail = z
  .string()
  .trim()
  .refine((v) => v === '' || EMAIL_PATTERN.test(v), 'البريد الإلكتروني غير صالح');

const optionalUrl = z
  .string()
  .trim()
  .refine((v) => v === '' || /^https?:\/\/\S+$/.test(v), 'رابط الأعمال غير صالح');

export const cvSchema = z.object({
  fullName: z.string().trim(),
  email: optionalEmail,
  phone: z.string().trim(),
  edu: z.string().trim(),
  years: z.string().trim(),
  exp: z.string().trim(),
  portfolio: optionalUrl,
});

export type CvValues = z.infer<typeof cvSchema>;

export const contractSchema = z.object({
  title: z.string().trim().min(1, 'اسم المشروع / المهمة مطلوب'),
  duration: z.string().trim().min(1, 'المدة المتوقعة مطلوبة'),
  value: z.string().trim().min(1, 'القيمة (ريال) مطلوبة'),
  orgSig: z.string().trim().min(1, 'توقيع الجهة (الاسم) مطلوب'),
});

export type ContractValues = z.infer<typeof contractSchema>;
