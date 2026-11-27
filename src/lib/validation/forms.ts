import { z } from 'zod';

/**
 * CV form validation (client + PATCH /api/specialist/profile): the name is
 * required; every other field is optional with format and length checks.
 * Contract input is validated server-side by `parseContractInput`
 * (src/lib/validation/marketplace.ts).
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
  fullName: z.string().trim().min(2, 'الاسم الكامل مطلوب').max(200, 'الاسم طويل جداً'),
  email: optionalEmail.pipe(z.string().max(320, 'البريد طويل جداً')),
  phone: z.string().trim().max(32, 'رقم الجوال طويل جداً'),
  edu: z.string().trim().max(200, 'التخصص طويل جداً'),
  city: z.string().trim().max(100, 'اسم المدينة طويل جداً'),
  years: z
    .string()
    .trim()
    .refine((v) => v === '' || (/^\d{1,2}$/.test(v) && Number(v) <= 70), 'سنوات الخبرة رقم بين 0 و70'),
  exp: z.string().trim().max(5000, 'النبذة أطول من 5000 حرف'),
  portfolio: optionalUrl.pipe(z.string().max(300, 'الرابط طويل جداً')),
});

export type CvValues = z.infer<typeof cvSchema>;
