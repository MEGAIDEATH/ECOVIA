 

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { useToast } from '@/components/ui/Toast';

import { clearPreferredRole } from './preferredRole';

/**
 * Signs the user out on the server:
 * clears the preferred role, toasts, then returns home after 1s.
 * Only the server session is authoritative — nothing is cached in the browser.
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