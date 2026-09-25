'use client';

import { getFirebaseAuth } from '@/lib/firebase/client';

import type { OrganizationDirectoryEntry, PublicSpecialist, PublicSpecialistSummary } from '@/types';

async function directoryRequest<T>(kind: 'specialists' | 'organizations', uid?: string): Promise<T> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('يرجى تسجيل الدخول أولاً.');

  const params = new URLSearchParams({ kind });
  if (uid) params.set('uid', uid);
  const response = await fetch(`/api/directory?${params.toString()}`, {
    headers: { Authorization: `Bearer ${await user.getIdToken()}` },
  });
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

export function getPublicSpecialists(): Promise<PublicSpecialistSummary[]> {
  return directoryRequest<PublicSpecialistSummary[]>('specialists');
}

export function getPublicSpecialist(uid: string): Promise<PublicSpecialist> {
  return directoryRequest<PublicSpecialist>('specialists', uid);
}

export function getPublicOrganizations(): Promise<OrganizationDirectoryEntry[]> {
  return directoryRequest<OrganizationDirectoryEntry[]>('organizations');
}

export function getPublicOrganization(uid: string): Promise<OrganizationDirectoryEntry> {
  return directoryRequest<OrganizationDirectoryEntry>('organizations', uid);
}
