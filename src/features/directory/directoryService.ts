 

import type { OrganizationDirectoryEntry, PublicSpecialist, PublicSpecialistSummary } from '@/types';

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

export function getPublicSpecialists(): Promise<PublicSpecialistSummary[]> {
  return directoryRequest<PublicSpecialistSummary[]>('specialists');
}

export function getPublicSpecialist(id: string): Promise<PublicSpecialist> {
  return directoryRequest<PublicSpecialist>('specialists', id);
}

export function getPublicOrganizations(): Promise<OrganizationDirectoryEntry[]> {
  return directoryRequest<OrganizationDirectoryEntry[]>('organizations');
}

export function getPublicOrganization(id: string): Promise<OrganizationDirectoryEntry> {
  return directoryRequest<OrganizationDirectoryEntry>('organizations', id);
}
