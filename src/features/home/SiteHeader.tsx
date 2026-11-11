import { BrandMark } from '@/components/brand/BrandMark';

import { HeaderActions } from './HeaderActions';
import styles from './landing.module.css';

const NAV = [
  { href: '#about', label: 'عن إيكوفيا' },
  { href: '#services', label: 'الخدمات المهنية' },
  { href: '#community', label: 'المجتمع البيئي' },
  { href: '#faq', label: 'الأسئلة الشائعة' },
] as const;

/** Public landing header: brand, in-page navigation, account actions. */
export function SiteHeader() {
  return (
    <header className="relative z-10 border-b border-forest/10 bg-white/95">
      <div className="container-brand flex min-h-[78px] flex-wrap items-center justify-between gap-x-3 gap-y-0 py-2.5 md:min-h-[94px] lg:flex-nowrap lg:gap-6 lg:py-0">
        <BrandMark href="/" />
        <nav
          aria-label="أقسام الصفحة"
          className="scrollbar-none order-3 flex w-full items-center gap-6 overflow-x-auto border-t border-[#eaf0ec] pt-[13px] pb-3 text-[15px] font-semibold text-on-surface-variant lg:order-none lg:w-auto lg:gap-[31px] lg:overflow-visible lg:border-0 lg:p-0"
        >
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className={`${styles.navLink} shrink-0`}>
              {item.label}
            </a>
          ))}
        </nav>
        <HeaderActions />
      </div>
    </header>
  );
}
