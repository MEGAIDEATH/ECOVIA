'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { useToast } from '@/components/ui/Toast';

import { clearPreferredRole } from './preferredRole';

/**
 * Port of the legacy `performLogout()`:
 * clears the preferred role, toasts, then returns home after 1s.
 * The anonymous Firebase session is intentionally kept (legacy reloaded the
 * page without signing out, so the same UID could log back in).
 */
export function usePerformLogout() {
  const router = useRouter();
  const { showToast } = useToast();

  const performLogout = useCallback(() => {
    clearPreferredRole();
    showToast('تم تسجيل الخروج بنجاح');
    window.setTimeout(() => router.replace('/'), 1000);
  }, [router, showToast]);

  return performLogout;
}