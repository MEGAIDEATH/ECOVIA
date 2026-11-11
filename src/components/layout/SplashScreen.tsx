'use client';

import { useEffect, useState } from 'react';

type SplashPhase = 'visible' | 'fading' | 'hidden';

/**
 * Brand splash screen — same timing contract as the legacy inline script:
 * hides on window `load`, with a 2.5s fallback, fading out over 700ms.
 */
export function SplashScreen() {
  const [phase, setPhase] = useState<SplashPhase>('visible');

  useEffect(() => {
    let done = false;
    const hide = () => {
      if (done) return;
      done = true;
      setPhase('fading');
      window.setTimeout(() => setPhase('hidden'), 700);
    };

    window.addEventListener('load', hide);
    const fallback = window.setTimeout(hide, 2500);
    return () => {
      window.removeEventListener('load', hide);
      window.clearTimeout(fallback);
    };
  }, []);

  if (phase === 'hidden') return null;

  return (
    <div
      data-testid="splash-screen"
      aria-hidden={phase === 'fading'}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[radial-gradient(circle_at_68%_31%,rgba(143,191,175,.35),transparent_35%),linear-gradient(140deg,#0c302e,#11514a_60%,#347b67)] transition-opacity duration-700 ${
        phase === 'fading' ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center">
        <div className="mb-6 grid size-24 place-items-center rounded-full bg-white shadow-dialog motion-safe:animate-pulse">
          <img src="/assets/ecovia-logo.png" alt="" width={207} height={198} className="size-16 object-contain" />
        </div>
        <p lang="en" className="font-latin text-3xl font-extrabold tracking-[.12em] text-white">
          ECOVIA
        </p>
        <p className="mb-3 text-sm tracking-[.15em] text-on-dark-muted">إيكوفيا</p>
        <p role="status" className="text-xs text-on-dark-muted/80">
          جاري التحميل...
        </p>
      </div>
    </div>
  );
}
