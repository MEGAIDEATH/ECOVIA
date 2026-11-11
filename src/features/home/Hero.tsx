import { HeroVisual } from './HeroVisual';
import { LandingIcon, type LandingIconName } from './icons';
import styles from './landing.module.css';

const TAGS = ['خدمات بيئية متخصصة', 'فرص مهنية', 'توعية مجتمعية'] as const;

const RIBBON: ReadonlyArray<{ label: string; icon: LandingIconName }> = [
  { label: 'منظومة واحدة', icon: 'plus' },
  { label: 'فرص تصل لأصحابها', icon: 'trend' },
  { label: 'أثر مستدام', icon: 'leaf' },
];

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className={styles.hero}>
      <div className="container-brand grid grid-cols-1 items-center gap-7 md:grid-cols-[1.07fr_.93fr] lg:gap-[58px]">
        <div>
          <div className="inline-flex items-center gap-[9px] text-base font-bold tracking-[.02em] text-green">
            منصة بيئية سعودية
          </div>
          <h1
            id="hero-title"
            className="mt-[25px] mb-[22px] text-[clamp(43px,10vw,64px)] leading-[1.32] font-bold tracking-[-.055em] text-forest md:text-[clamp(46px,5.4vw,80px)]"
          >
            بيئة واحدة.<span className="block text-green">أثر أبقى.</span>
          </h1>
          <p className="mt-0 mb-[30px] max-w-[580px] text-base leading-[2.05] text-muted md:text-[17px]">
            تجمع إيكوفيا المنشآت بالأخصائيين البيئيين في مساحة مهنية واضحة، وتفتح باب المعرفة والمشاركة البيئية
            للجميع.
          </p>
          <ul className="mt-[27px] flex flex-wrap gap-2.5" aria-label="ما تقدمه إيكوفيا">
            {TAGS.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-[#dde8e0] bg-white/75 px-3.5 py-2 text-sm font-semibold text-on-surface-variant"
              >
                {tag}
              </li>
            ))}
          </ul>
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}

/** White band overlapping the hero with the three brand promises. */
export function TrustRibbon() {
  return (
    <div className="relative z-[3] -mt-12 bg-white">
      <ul className="container-brand flex min-h-[98px] flex-wrap items-center justify-start gap-x-[22px] gap-y-3 rounded-[18px] border border-line bg-white p-[19px] shadow-[0_13px_42px_rgba(18,47,36,.06)] md:flex-nowrap md:justify-around md:gap-3.5 md:p-5">
        {RIBBON.map((item) => (
          <li
            key={item.label}
            className="flex flex-[1_1_100%] items-center gap-[13px] text-xs font-bold text-forest xs:flex-initial md:text-sm"
          >
            <span className="icon-tile size-9 md:size-11">
              <LandingIcon name={item.icon} className="size-[23px]" />
            </span>
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
