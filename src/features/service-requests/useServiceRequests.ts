'use client';

import { useEffect, useState } from 'react';

import type { ServiceRequest } from '@/types';

type LoadState<T> = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: T };

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.json();
}

/**
 * Service requests for the signed-in account. The server decides the scope:
 * an organization gets its own requests, an approved specialist gets the
 * pending requests available to accept.
 */
export function useServiceRequests(): LoadState<ServiceRequest[]> {
  const [state, setState] = useState<LoadState<ServiceRequest[]>>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    getJson('/api/service-requests')
      .then((data) => {
        if (active) setState({ status: 'ready', data: Array.isArray(data) ? (data as ServiceRequest[]) : [] });
      })
      .catch((error: unknown) => {
        console.error('[service-requests] list failed:', error);
        if (active) setState({ status: 'error' });
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
}

/** One service request; `data` is null when it does not exist / is not visible. */
export function useServiceRequest(id: string | undefined) {
  const [state, setState] = useState<LoadState<ServiceRequest | null>>({ status: 'loading' });

  useEffect(() => {
    if (!id) return;
    let active = true;
    fetch(`/api/service-requests/${encodeURIComponent(id)}`)
      .then(async (res) => {
        if (res.status === 404 || res.status === 403) return null;
        if (!res.ok) throw new Error(`GET request ${id} → ${res.status}`);
        const data = (await res.json()) as ServiceRequest | null;
        return data && data.id ? data : null;
      })
      .then((data) => {
        if (active) setState({ status: 'ready', data });
      })
      .catch((error: unknown) => {
        console.error('[service-requests] detail failed:', error);
        if (active) setState({ status: 'error' });
      });
    return () => {
      active = false;
    };
  }, [id]);

  /** Replace the loaded request after a successful mutation. */
  const replace = (next: ServiceRequest) => setState({ status: 'ready', data: next });
  return { state, replace };
}
