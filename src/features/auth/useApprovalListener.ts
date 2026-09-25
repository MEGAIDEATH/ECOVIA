'use client';

import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useRef } from 'react';

import { getDb } from '@/lib/firebase/client';
import { organizationDocPath, specialistDocPath } from '@/lib/firestore/paths';
import type { UserRole } from '@/types';

/**
 * Subscribes to the user's own account document and invokes `onApproved`
 * the first time `status` becomes `approved` (legacy `listenToStatus`).
 * Always unsubscribes on unmount/dependency change; fires at most once.
 */
export function useApprovalListener(
  uid: string | null,
  role: UserRole | null,
  onApproved: () => void,
): void {
  const onApprovedRef = useRef(onApproved);

  useEffect(() => {
    onApprovedRef.current = onApproved;
  }, [onApproved]);

  useEffect(() => {
    if (!uid || !role) return;

    const path = role === 'spec' ? specialistDocPath(uid) : organizationDocPath(uid);
    let fired = false;

    const unsubscribe = onSnapshot(
      doc(getDb(), path),
      (snapshot) => {
        if (fired) return;
        const status = snapshot.exists()
          ? (snapshot.data().status as string | undefined)
          : undefined;
        if (status === 'approved') {
          fired = true;
          onApprovedRef.current();
        }
      },
      (error) => {
        console.error('[approval-listener] snapshot error:', error);
      },
    );

    return unsubscribe;
  }, [uid, role]);
}