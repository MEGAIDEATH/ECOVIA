import Link from 'next/link';

import type { StatusTone } from '@/lib/status';

const TONE: Record<StatusTone, string> = {
  brand: 'bg-accent-soft text-secondary',
  warning: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-info',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-surface-container-low text-on-surface-variant',
};

/** Dashboard counter (real persisted counts only — never placeholders). */
export function MetricTile({
  icon,
  value,
  label,
  tone,
  href,
  testId,
}: {
  icon: string;
  value: number;
  label: string;
  tone: StatusTone;
  href: string;
  testId?: string;
}) {
  return (
    <Link href={href} className="card card-interactive flex min-h-28 items-center gap-3 p-4 no-underline md:p-5" data-testid={testId}>
      <span className={`grid size-11 shrink-0 place-items-center rounded-[14px] ${TONE[tone]}`}>
        <span aria-hidden="true" className="material-symbols-outlined text-[24px]">
          {icon}
        </span>
      </span>
      <span className="min-w-0">
        <span className="block text-2xl leading-tight font-bold text-forest">{value}</span>
        <span className="block text-xs font-semibold text-muted">{label}</span>
      </span>
    </Link>
  );
}
