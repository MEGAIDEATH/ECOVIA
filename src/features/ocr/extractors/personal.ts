/**
 * Personal document OCR extraction (identity card / license).
 * Ported 1:1 from the legacy `simulatePersonalScan()` parser so extracted
 * values behave exactly like before.
 */

const ENGLISH_EXCLUDE_WORDS = ['kingdom', 'saudi', 'arabia', 'ministry', 'freelancer', 'elesl'];

const ARABIC_EXCLUDE_WORDS = [
  'المملكة',
  'العربية',
  'السعودية',
  'وزارة',
  'الهيئة',
  'رقم',
  'تاريخ',
  'اصدار',
  'الوطنية',
  'هوية',
  'مقيم',
  'بطاقة',
  'رخصة',
  'العمل',
  'بيئة',
  'المركز',
  'مكان',
  'الميلاد',
  'صادرة',
  'سجل',
  'الاساسية',
  'البيانات',
  'صاحب',
  'العنوان',
  'الخدمات',
  'الفئة',
  'انتهاء',
  'الهاتف',
];

/** Saudi national ID: 10 digits starting with 1 or 2. */
export function extractNationalId(rawText: string): string | null {
  const text = rawText.replace(/\n/g, ' ');
  const idMatch = text.match(/\b([12]\d{9})\b/);
  return idMatch ? idMatch[1] : null;
}

/** Saudi mobile: `9665XXXXXXXX` is normalized to `05XXXXXXXX`. */
export function extractSaudiPhone(rawText: string): string | null {
  const text = rawText.replace(/\n/g, ' ');
  const cleanForPhone = text.replace(/[\s\-\+\(\)]/g, '');
  const phoneMatch = cleanForPhone.match(/(?:9665|05)\d{8}/);
  if (!phoneMatch) return null;
  let phone = phoneMatch[0];
  if (phone.startsWith('966')) phone = '0' + phone.substring(3);
  return phone;
}

/**
 * English name first (longest candidate, uppercased), Arabic fallback
 * (at least 3 non-document words, up to 4 joined).
 */
export function extractPersonName(rawText: string): string | null {
  const text = rawText.replace(/\n/g, ' ');

  const engNameRegex = /\b([a-zA-Z]{2,}(?:\s+[a-zA-Z]{1,}){1,5})\b/g;
  const engMatches = text.match(engNameRegex);
  if (engMatches) {
    const validNames = engMatches.filter(
      (m) => !ENGLISH_EXCLUDE_WORDS.some((ex) => m.toLowerCase().includes(ex)),
    );
    if (validNames.length > 0) {
      validNames.sort((a, b) => b.length - a.length);
      return validNames[0].trim().toUpperCase();
    }
  }

  const arabicWords = text.match(/([أ-ي]{3,})/g);
  if (arabicWords && arabicWords.length >= 3) {
    const filteredWords = arabicWords.filter((w) => !ARABIC_EXCLUDE_WORDS.includes(w));
    if (filteredWords.length >= 3) {
      return filteredWords.slice(0, Math.min(4, filteredWords.length)).join(' ');
    }
  }

  return null;
}

export interface PersonalExtraction {
  nationalId: string | null;
  phone: string | null;
  name: string | null;
}

/** Runs all personal extractors over one OCR text sample. */
export function extractPersonalInfo(rawText: string): PersonalExtraction {
  return {
    nationalId: extractNationalId(rawText),
    phone: extractSaudiPhone(rawText),
    name: extractPersonName(rawText),
  };
}
