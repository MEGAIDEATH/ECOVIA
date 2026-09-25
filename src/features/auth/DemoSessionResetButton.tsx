'use client';

import { useState } from 'react';

import { DEMO_SESSION_RESET_ENABLED } from '@/lib/config/env';

import { startFreshDemoSession } from './demoSession';

/**
 * Demo/development-only action that starts a brand-new anonymous session so
 * the whole registration flow can be re-tested with a fresh UID.
 *
 * It only signs the browser out and reloads — no Firestore documents or
 * Firebase users are deleted, and security rules are untouched. Renders
 * nothing unless `NEXT_PUBLIC_DEMO_SESSION_RESET=true` (never in production).
 */
export function DemoSessionResetButton() {
  const [starting, setStarting] = useState(false);

  if (!DEMO_SESSION_RESET_ENABLED) return null;

  const handleStart = async () => {
    setStarting(true);
    try {
      await startFreshDemoSession();
    } catch (error) {
      console.error('[demo] failed to start a new demo session:', error);
      setStarting(false);
    }
  };

  return (
    <button
      type="button"
      data-testid="demo-session-reset"
      onClick={() => void handleStart()}
      disabled={starting}
      className="text-xs text-primary/60 hover:text-primary transition-colors flex items-center gap-1 disabled:opacity-70"
    >
      <span className="material-symbols-outlined text-[14px]">restart_alt</span>
      {starting ? 'جاري بدء جلسة جديدة...' : 'بدء جلسة تجريبية جديدة'}
    </button>
  );
}