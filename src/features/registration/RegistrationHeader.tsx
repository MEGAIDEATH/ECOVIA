'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

interface RegistrationHeaderProps {
  /** Destination of the round back button (legacy `arrow_forward` icon). */
  backHref: string;
  title: string;
  subtitle: string;
  children?: ReactNode;
}

/**
 * Shared header for registration steps: back button + title/subtitle,
 * matching the legacy step/OTP headers.
 */
export function RegistrationHeader({ backHref, title, subtitle, children }: RegistrationHeaderProps) {
  return (
    <header className="flex items-center justify-between mb-8">
      <Link
        href={backHref}
        aria-label="رجوع"
        className="w-10 h-10 rounded-full bg-white border border-outline-variant flex items-center justify-center hover:bg-surface-container-low transition-colors shadow-sm"
      >
        <span className="material-symbols-outlined text-on-surface">arrow_forward</span>
      </Link>
      <div className="text-left">
        <h2 className="text-2xl font-bold text-primary">{title}</h2>
        <p className="text-secondary text-sm font-medium">{subtitle}</p>
      </div>
      {children}
    </header>
  );
}