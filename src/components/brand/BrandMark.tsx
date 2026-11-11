import Image from 'next/image';
import Link from 'next/link';

interface BrandMarkProps {
  /** `dark` = forest text for light backgrounds; `light` = for forest/pine panels. */
  tone?: 'dark' | 'light';
  size?: 'lg' | 'md' | 'sm';
  /** Wraps the mark in a link (usually to the landing page). */
  href?: string;
  className?: string;
}

const SIZES = {
  lg: { img: 'size-[37px] xs:size-[42px] md:size-14', latin: 'text-base xs:text-[19px] md:text-[23px]', ar: 'text-[10px] xs:text-[11px] md:text-sm' },
  md: { img: 'size-10', latin: 'text-lg', ar: 'text-[11px]' },
  sm: { img: 'size-8', latin: 'text-base', ar: 'text-[10px]' },
} as const;

/** Official ECOVIA logo + bilingual wordmark (never redrawn). */
export function BrandMark({ tone = 'dark', size = 'lg', href, className = '' }: BrandMarkProps) {
  const s = SIZES[size];
  const color = tone === 'dark' ? 'text-forest' : 'text-[#eaf5ee]';
  const content = (
    <>
      <Image
        src="/assets/ecovia-logo.png"
        width={207}
        height={198}
        alt="رمز إيكوفيا"
        className={`${s.img} object-contain drop-shadow-sm`}
        preload={size === 'lg'}
      />
      <span className={`flex flex-col leading-[1.15] ${color}`}>
        <strong lang="en" className={`font-latin font-extrabold tracking-[.08em] ${s.latin}`}>
          ECOVIA
        </strong>
        <small className={`mt-[3px] tracking-[.15em] ${s.ar}`}>إيكوفيا</small>
      </span>
    </>
  );
  const classes = `inline-flex items-center gap-[11px] whitespace-nowrap no-underline ${className}`;

  return href ? (
    <Link href={href} className={classes} aria-label="إيكوفيا — الصفحة الرئيسية">
      {content}
    </Link>
  ) : (
    <div className={classes}>{content}</div>
  );
}
