'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { usePerformLogout } from '@/features/auth/usePerformLogout';

const TABS = [
  { href: '/specialist', label: 'الرئيسية' },
  { href: '/specialist/cv', label: 'السيرة الذاتية (CV)' },
  { href: '/specialist/organizations', label: 'تقديم للمنشآت' },
  { href: '/specialist/messages', label: 'الطلبات والتواصل', badgeId: 'spec-noti-badge' },
] as const;

/** Specialist dashboard sticky header (branding + print + logout + tab pills). */
export function SpecialistDashboardHeader() {
  const pathname = usePathname();
  const performLogout = usePerformLogout();

  return (
    <header className="bg-primary text-white p-6 rounded-b-3xl shadow-lg sticky top-0 z-30 editorial-gradient">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-4xl bg-white/20 p-2 rounded-xl backdrop-blur-sm shadow-sm border border-white/10">
            eco
          </span>
          <div>
            <h1 className="text-xl font-bold">مرحباً، أخصائي</h1>
            <p className="text-sm text-primary-fixed font-medium">لوحة التحكم والمشاريع</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors border border-white/10 shadow-sm"
            title="طباعة"
            aria-label="طباعة"
          >
            <span className="material-symbols-outlined text-white">print</span>
          </button>
          <button
            type="button"
            onClick={performLogout}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors border border-white/10 shadow-sm text-red-300 hover:text-red-400"
            title="تسجيل خروج"
            aria-label="تسجيل خروج"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </div>

      <nav
        aria-label="أقسام لوحة التحكم"
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide no-scrollbar snap-x"
      >
        {TABS.map((tab) => {
          const active =
            tab.href === '/specialist'
              ? pathname === tab.href
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`snap-start relative flex-shrink-0 px-4 py-2 rounded-full font-bold text-sm transition-colors whitespace-nowrap border ${
                active
                  ? 'bg-white/20 border-white/10 shadow-sm'
                  : 'text-white/70 hover:bg-white/10 border-transparent'
              }`}
            >
              {tab.label}
              {'badgeId' in tab && (
                <span
                  id={tab.badgeId}
                  className="absolute -top-1 -left-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full hidden border border-primary"
                />
              )}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}