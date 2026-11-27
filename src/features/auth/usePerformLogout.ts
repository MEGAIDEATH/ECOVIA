'use client';

import { useCallback } from 'react';

import { useToast } from '@/components/ui/Toast';

/**
 * Client logout for screens outside the workspaces (admin portal): destroys
 * the server session through POST /api/session/logout, then reloads the home
 * page so no client state survives. The workspaces use the `logoutAction`
 * Server Action (works without JavaScript).
 */
export function usePerformLogout() {
  const { showToast } = useToast();

  return useCallback(async () => {
    await fetch('/api/session/logout', { method: 'POST' }).catch(() => null);
    showToast('تم تسجيل الخروج بنجاح');
    // A full document load (not a client transition) so no in-memory state survives logout.
    window.location.replace(window.location.origin);
  }, [showToast]);
}
