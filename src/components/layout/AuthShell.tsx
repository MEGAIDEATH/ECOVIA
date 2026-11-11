import Link from 'next/link';
import type { ReactNode } from 'react';

import { BrandMark } from '@/components/brand/BrandMark';

interface AuthShellProps {
  title: string;
  subtitle?: ReactNode;
  /** Round back button in the card header (registration steps). */
  backHref?: string;
  /** Icon shown above the title (Material Symbols name). */
  icon?: string;
  /** Card width: `sm` login/OTP, `md` registration, `lg` role choice. */
  width?: 'sm' | 'md' | 'lg';
  /** Content rendered below the card (secondary links). */
  footer?: ReactNode;
  children: ReactNode;
}

const WIDTHS = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' } as const;

/**
 * Focused layout for every public account screen (login, registration, OTP,
 * password recovery, waiting room): the landing page's header brand, soft hero
 * wash and card treatment, without the marketing chrome.
 */
export function AuthShell({
  title,
  subtitle,
  backHref,
  icon,
  width = 'sm',
  footer,
  children,
}: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_8%_9%,rgba(143,191,175,.17)_0,transparent_32%),linear-gradient(150deg,#fcfdfa_10%,#f3f7f3_86%)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-[330px] top-10 size-[520px] rounded-full border border-green/10"
      />
      <header className="relative z-10 border-b border-forest/10 bg-white/90 backdrop-blur-sm">
        <div className="container-brand flex min-h-[72px] items-center justify-between gap-4">
          <BrandMark href="/" size="md" />
          <Link href="/" className="btn btn-ghost btn-sm">
            الصفحة الرئيسية
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-start justify-center px-4 py-10 md:items-center md:py-14">
        <div className={`w-full ${WIDTHS[width]}`}>
          <section className="card rounded-[24px] p-6 shadow-raised md:p-8">
            <header className="mb-6 flex items-start gap-4">
              {backHref && (
                <Link href={backHref} aria-label="رجوع" className="btn btn-secondary btn-icon shrink-0">
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </Link>
              )}
              <div className="min-w-0 flex-1">
                {icon && (
                  <span className="icon-tile icon-tile-lg mb-4">
                    <span className="material-symbols-outlined text-[28px]">{icon}</span>
                  </span>
                )}
                <h1 className="text-2xl leading-snug font-bold tracking-[-.02em] text-forest">{title}</h1>
                {subtitle && <p className="mt-1 text-[15px] leading-relaxed text-muted">{subtitle}</p>}
              </div>
            </header>
            {children}
          </section>
          {footer && <div className="mt-5 text-center text-sm text-muted">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
