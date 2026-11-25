/**
 * Consistent Arabic date/time formatting (Gregorian calendar, Latin digits
 * avoided by `ar-SA` defaults are kept for readability in RTL).
 */
const DATE = new Intl.DateTimeFormat('ar-SA-u-ca-gregory', { day: 'numeric', month: 'long', year: 'numeric' });
const DATE_TIME = new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateAr(value: string | Date | null | undefined): string | null {
  const date = toDate(value);
  return date ? DATE.format(date) : null;
}

export function formatDateTimeAr(value: string | Date | null | undefined): string | null {
  const date = toDate(value);
  return date ? DATE_TIME.format(date) : null;
}

/** "قبل 5 دقائق" style relative time for notifications (falls back to the date). */
export function formatRelativeAr(value: string | Date | null | undefined, now: Date = new Date()): string | null {
  const date = toDate(value);
  if (!date) return null;
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  const rtf = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' });
  if (abs < 60) return rtf.format(seconds, 'second');
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute');
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), 'hour');
  if (abs < 7 * 86_400) return rtf.format(Math.round(seconds / 86_400), 'day');
  return formatDateAr(date);
}

const FILE_SIZE_UNITS = ['بايت', 'ك.ب', 'م.ب'];

export function formatFileSize(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < FILE_SIZE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${FILE_SIZE_UNITS[unit]}`;
}
