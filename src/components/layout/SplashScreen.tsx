'use client';

import { useEffect, useState } from 'react';

type SplashPhase = 'visible' | 'fading' | 'hidden';

/**
 * Animated splash screen — identical timing to the legacy inline script:
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
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center editorial-gradient transition-opacity duration-700 ${
        phase === 'fading' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl mb-6 animate-bounce">
          <span className="material-symbols-outlined text-primary text-6xl">eco</span>
        </div>
        <h1 className="text-white text-4xl font-bold tracking-tight mb-2">منصة بيئيين</h1>
        <p className="text-primary-fixed text-sm font-medium">جاري التحميل...</p>
      </div>
    </div>
  );
}
