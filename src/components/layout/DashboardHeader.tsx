'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { BrandMark } from '@/components/brand/BrandMark';
import { usePerformLogout } from '@/features/auth/usePerformLogout';

export interface DashboardTab {
  href: string;
  label: string;
}

interface DashboardHeaderProps {
  /** Workspace name, e.g. "بوابة المنشآت". */
  title: string;
  subtitle: string;
  icon: string;
  /** Route tabs; the first is the workspace home and only matches exactly. */
  tabs?: readonly DashboardTab[];
  /** Where the brand mark links to (defaults to the first tab). */
  homeHref?: string;
  /** Extra round actions placed before logout (e.g. print). */
  actions?: ReactNode;
  /** Overrides the default session logout (admin also ends its admin session). */
  onLogout?: () => void;
}

function isActive(pathname: string, href: string, isHome: boolean) {
  return isHome ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Shared sticky header for the organization and specialist workspaces:
 * brand + workspace identity + actions, and an underlined tab bar that
 * scrolls horizontally on small screens.
 */
export function DashboardHeader({
  title,
  subtitle,
  icon,
  tabs = [],
  homeHref,
  actions,
  onLogout,
}: DashboardHeaderProps) {
  const pathname = usePathname();
  const performLogout = usePerformLogout();

  return (
    <header className="sticky top-0 z-30 border-b border-forest/10 bg-white/95 backdrop-blur-sm">
      <div className="container-brand flex min-h-[72px] items-center justify-between gap-4 py-2">
        <div className="flex min-w-0 items-center gap-4">
          {/* Wrapper owns visibility so it never competes with BrandMark's own display class. */}
          <span className="hidden sm:block">
            <BrandMark href={homeHref ?? tabs[0]?.href ?? '/'} size="md" />
          </span>
          <span aria-hidden="true" className="hidden h-9 w-px bg-line sm:block" />
          <div className="flex min-w-0 items-center gap-3">
            <span className="icon-tile size-10 rounded-xl">
              <span aria-hidden="true" className="material-symbols-outlined text-[22px]">
                {icon}
              </span>
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-base leading-tight font-bold text-forest">{title}</h1>
              <p className="truncate text-xs text-muted">{subtitle}</p>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          <button
            type="button"
            onClick={onLogout ?? performLogout}
            className="btn btn-secondary btn-sm gap-1.5 text-danger"
            aria-label="تسجيل خروج"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              logout
            </span>
            <span className="hidden sm:inline">خروج</span>
          </button>
        </div>
      </div>

      {tabs.length > 0 && (
      <nav aria-label="أقسام لوحة التحكم" className="container-brand">
        <ul className="scrollbar-none -mb-px flex gap-6 overflow-x-auto">
          {tabs.map((tab, index) => {
            const active = isActive(pathname, tab.href, index === 0);
            return (
              <li key={tab.href} className="shrink-0">
                <Link
                  href={tab.href}
                  aria-current={active ? 'page' : undefined}
                  className={`block border-b-2 py-3 text-sm font-semibold whitespace-nowrap no-underline transition-colors ${
                    active
                      ? 'border-secondary text-forest'
                      : 'border-transparent text-on-surface-variant hover:border-line-strong hover:text-secondary'
                  }`}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      )}
    </header>
  );
}
