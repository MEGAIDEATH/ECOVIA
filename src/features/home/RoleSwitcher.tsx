'use client';

import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';

import styles from './landing.module.css';
import { Reveal } from './Reveal';

type RoleKey = 'org' | 'pro';

interface RoleContent {
  key: RoleKey;
  tab: string;
  eyebrow: string;
  headline: string;
  summary: string;
  features: readonly string[];
}

const ROLES: readonly RoleContent[] = [
  {
    key: 'org',
    tab: 'للمنشآت',
    eyebrow: 'للمنشآت',
    headline: 'الخبرة المناسبة أقرب إليك.',
    summary: 'من البحث عن أخصائي بيئي إلى متابعة الخدمة في مساحة موحّدة.',
    features: [
      'استعراض الخدمات البيئية والمتطلبات',
      'العثور على أخصائيين مؤهلين',
      'إنشاء طلبات الخدمات ومراجعة العروض',
      'التواصل ومتابعة التنفيذ والمخرجات',
    ],
  },
  {
    key: 'pro',
    tab: 'للأخصائيين',
    eyebrow: 'للأخصائيين البيئيين',
    headline: 'خبرتك تستحق أن تُرى.',
    summary: 'مساحة مهنية تعرض مؤهلاتك وتساعدك في الوصول إلى فرص تتناسب مع تخصصك.',
    features: [
      'إنشاء ملف مهني وشهادات وأعمال سابقة',
      'عرض التخصصات والخدمات البيئية',
      'متابعة طلبات المنشآت وتقديم العروض',
      'إدارة التعاقدات والتسليم والتقييمات',
    ],
  },
];

/** Horizontal swipe distance (px) and dominance ratio that switch roles. */
const SWIPE_MIN = 55;
const SWIPE_RATIO = 1.4;

/**
 * "For organizations / for specialists" tabs: animated selection slider,
 * roving keyboard focus (arrows/Home/End), and swipe-to-switch on the panel.
 * Renders both grid columns: the `intro` copy + tabs, and the panel stage.
 */
export function RoleSwitcher({ intro }: { intro: ReactNode }) {
  const [active, setActive] = useState<RoleKey>('org');
  /** Panels animate only after the visitor switches, never on first paint. */
  const [interacted, setInteracted] = useState(false);
  const tablistRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLSpanElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const swipeRef = useRef<{ x: number; y: number; id: number } | null>(null);
  const activeIndex = ROLES.findIndex((role) => role.key === active);

  // Measure the selected tab and move the slider under it (and on resize).
  useLayoutEffect(() => {
    const place = () => {
      const tab = tabRefs.current[activeIndex];
      const slider = sliderRef.current;
      if (!tab || !slider) return;
      slider.style.width = `${tab.offsetWidth}px`;
      slider.style.left = `${tab.offsetLeft}px`;
    };
    place();
    const tablist = tablistRef.current;
    if (!tablist) return;
    // Until this runs, CSS paints the selected tab itself (no empty slider).
    tablist.dataset.ready = 'true';
    if (typeof ResizeObserver === 'undefined') return;
    const resize = new ResizeObserver(place);
    resize.observe(tablist);
    return () => resize.disconnect();
  }, [activeIndex]);

  const select = (key: RoleKey, focus = false) => {
    const index = ROLES.findIndex((role) => role.key === key);
    if (focus) tabRefs.current[index]?.focus();
    if (key === active) return;
    setInteracted(true);
    setActive(key);
  };

  const onTabKeyDown = (index: number) => (event: KeyboardEvent<HTMLButtonElement>) => {
    const last = ROLES.length - 1;
    let next: number;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    // RTL: the next tab sits to the left.
    else if (event.key === 'ArrowLeft') next = (index + 1) % ROLES.length;
    else if (event.key === 'ArrowRight') next = (index - 1 + ROLES.length) % ROLES.length;
    else return;
    event.preventDefault();
    select(ROLES[next].key, true);
  };

  const onStagePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as Element).closest('button, a')) return;
    swipeRef.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
  };

  const onStagePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const swipe = swipeRef.current;
    swipeRef.current = null;
    if (!swipe || swipe.id !== event.pointerId) return;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * SWIPE_RATIO) {
      select(active === 'org' ? 'pro' : 'org');
    }
  };

  return (
    <>
      <Reveal>
        {intro}
        <div ref={tablistRef} role="tablist" aria-label="الفئة المستهدفة" className={styles.roleTabs}>
          <span ref={sliderRef} aria-hidden="true" className={styles.roleSlider} />
          {ROLES.map((role, index) => {
            const selected = role.key === active;
            return (
              <button
                key={role.key}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                id={`tab-${role.key}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`panel-${role.key}`}
                tabIndex={selected ? 0 : -1}
                className={styles.roleTab}
                onClick={() => select(role.key)}
                onKeyDown={onTabKeyDown(index)}
              >
                {role.tab}
              </button>
            );
          })}
        </div>
      </Reveal>

      <Reveal
        role="group"
        aria-label="اسحب يمينًا أو يسارًا لتغيير الفئة المستهدفة"
        className={styles.roleStage}
        onPointerDown={onStagePointerDown}
        onPointerUp={onStagePointerUp}
        onPointerCancel={() => {
          swipeRef.current = null;
        }}
      >
        {ROLES.map((role) => (
          <div
            key={role.key}
            id={`panel-${role.key}`}
            role="tabpanel"
            aria-labelledby={`tab-${role.key}`}
            hidden={role.key !== active}
            data-entering={interacted ? 'true' : undefined}
            className={styles.rolePanel}
            style={{ '--slide-from': role.key === 'pro' ? '-20px' : '20px' } as CSSProperties}
          >
            <div className="inline-flex items-center gap-[9px] text-base font-bold tracking-[.02em] text-green">
              {role.eyebrow}
            </div>
            <p className="mt-0 mb-[9px] text-[27px] leading-[1.6] font-bold text-forest">{role.headline}</p>
            <p className="mt-0 mb-[27px] text-base text-muted">{role.summary}</p>
            <ul className="grid grid-cols-1 gap-x-5 gap-y-[19px] md:grid-cols-2">
              {role.features.map((feature) => (
                <li key={feature} className={styles.roleFeature}>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Reveal>
    </>
  );
}
