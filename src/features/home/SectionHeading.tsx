import type { ReactNode } from 'react';

import { Reveal } from './Reveal';

interface SectionHeadingProps {
  id: string;
  kicker: string;
  title: ReactNode;
  lead?: ReactNode;
  centered?: boolean;
  /** Skip the reveal wrapper when the heading sits inside another one. */
  plain?: boolean;
  className?: string;
}

export const H2 = 'my-[9px] mb-[13px] text-[clamp(30px,3.6vw,47px)] leading-[1.46] tracking-[-.045em] text-forest';
export const LEAD = 'm-0 text-base leading-[2.1] text-muted md:text-[17px]';

/** Kicker + h2 + lead block that opens most landing sections. */
export function SectionHeading({ id, kicker, title, lead, centered, plain, className = '' }: SectionHeadingProps) {
  const content = (
    <>
      <span className="kicker">{kicker}</span>
      <h2 id={id} className={H2}>
        {title}
      </h2>
      {lead && <p className={LEAD}>{lead}</p>}
    </>
  );
  const classes = `mb-11 max-w-[650px] ${centered ? 'mx-auto text-center' : ''} ${className}`;
  return plain ? <div className={classes}>{content}</div> : <Reveal className={classes}>{content}</Reveal>;
}
