import Link from 'next/link';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  /** Small "back" link above the title (detail pages). */
  back?: { href: string; label: string };
  /** Primary page action(s), aligned to the end. */
  actions?: ReactNode;
}

/** Title row used at the top of every dashboard page. */
export function PageHeader({ title, description, back, actions }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {back && (
        <Link
          href={back.href}
          className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-secondary no-underline hover:text-primary"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
            arrow_forward
          </span>
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl leading-snug font-bold tracking-[-.02em] text-forest">{title}</h2>
          {description && <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
