'use client';

import { useEffect, useRef, type HTMLAttributes } from 'react';

import styles from './landing.module.css';

type RevealTag = 'div' | 'article' | 'li';

type RevealProps = HTMLAttributes<HTMLElement> & { as?: RevealTag };

/** One IntersectionObserver shared by every reveal element on the page. */
let sharedObserver: IntersectionObserver | null = null;
const onVisible = new WeakMap<Element, () => void>();

function observer(): IntersectionObserver {
  sharedObserver ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        onVisible.get(entry.target)?.();
        onVisible.delete(entry.target);
        sharedObserver?.unobserve(entry.target);
      }
    },
    { threshold: 0.08 },
  );
  return sharedObserver;
}

/**
 * Fades its content in the first time it scrolls into view (landing `.reveal`).
 * Children stay server-rendered; this wrapper only flips `data-revealed`.
 * Content is visible without JS and under reduced motion (see the CSS).
 */
export function Reveal({ as: Tag = 'div', className = '', children, ...rest }: RevealProps) {
  // Typed as the widest of the allowed tags; only generic HTMLElement APIs are used.
  const ref = useRef<HTMLDivElement & HTMLLIElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const show = () => {
      element.dataset.revealed = 'true';
    };
    if (!('IntersectionObserver' in window)) {
      show();
      return;
    }
    const io = observer();
    onVisible.set(element, show);
    io.observe(element);
    return () => {
      onVisible.delete(element);
      io.unobserve(element);
    };
  }, []);

  return (
    <Tag {...rest} ref={ref} className={`${styles.reveal} ${className}`}>
      {children}
    </Tag>
  );
}
