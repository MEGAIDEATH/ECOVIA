 

import { useEffect, useRef } from 'react';
import type { UserRole } from '@/types';

/**
 * Polls the session to detect when a pending account becomes approved.
 */
export function useApprovalListener(
  userId: string | null,
  role: UserRole | null,
  onApproved: () => void,
): void {
  const onApprovedRef = useRef(onApproved);

  useEffect(() => {
    onApprovedRef.current = onApproved;
  }, [onApproved]);

  useEffect(() => {
    if (!userId || !role) return;

    let active = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/session');
        if (!res.ok || !active) return;
        const data = await res.json();
        const profile = role === 'spec' ? data.specialist : data.organization;
        if (profile?.status === 'approved') {
          clearInterval(interval);
          onApprovedRef.current();
        }
      } catch {
        // network retry
      }
    }, 2500);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [userId, role]);
}
