'use client';

import type { PublicSpecialist } from '@/types';

async function directoryRequest<T>(kind: 'specialists' | 'organizations', id?: string): Promise<T> {
  const params = new URLSearchParams({ kind });
  if (id) params.set('id', id);

  const response = await fetch(`/api/directory?${params.toString()}`);
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : 'تعذر تحميل البيانات، حاول مرة أخرى.';
    throw new Error(message);
  }
  return body as T;
}

/** One approved specialist's CV by PROFILE id (approved organizations only — enforced by the API). */
export function getPublicSpecialist(id: string): Promise<PublicSpecialist> {
  return directoryRequest<PublicSpecialist>('specialists', id);
}
