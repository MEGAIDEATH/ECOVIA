'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavTab {
  href: string;
  label: string;
  icon: string;
}

/**
 * Workspace tabs. Only the active-link highlight needs the browser
 * (usePathname); the links themselves are plain navigation.
 */
export function WorkspaceNav({ tabs }: { tabs: readonly NavTab[] }) {
  const pathname = usePathname();
  const home = tabs[0]?.href;
  return (
    <nav aria-label="أقسام مساحة العمل" className="min-w-0">
      <ul className="scrollbar-none -mb-px flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const active = tab.href === home ? pathname === tab.href : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href} className="shrink-0">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-1.5 border-b-2 px-2.5 py-3 text-sm font-semibold whitespace-nowrap no-underline transition-colors ${
                  active
                    ? 'border-secondary text-forest'
                    : 'border-transparent text-on-surface-variant hover:border-line-strong hover:text-secondary'
                }`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                  {tab.icon}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
