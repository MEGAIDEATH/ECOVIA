'use client';

import { useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import type { ServiceRequest } from '@/types';

/** POSTs a lifecycle action for a request and returns the updated record. */
export function useRequestAction(onUpdated: (next: ServiceRequest) => void) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  const run = async (id: string, action: string, body?: Record<string, unknown>, success?: string) => {
    if (busy) return false;
    setBusy(true);
    try {
      const res = await fetch(`/api/service-requests/${encodeURIComponent(id)}/${action}`, {
        method: 'POST',
        ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'حدث خطأ');
      onUpdated(data as ServiceRequest);
      if (success) showToast(success);
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'حدث خطأ', true);
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { run, busy };
}
