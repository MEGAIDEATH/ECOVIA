import { getPublicOrganizations } from '@/features/directory/directoryService';
import type { Organization } from '@/types';

/**
 * The signed-in organization's own profile (resolved server-side from the
 * session — no id is passed from the browser).
 */
export async function getOwnOrganization(): Promise<Organization | null> {
  const res = await fetch('/api/organization/profile');
  if (!res.ok) return null;
  return res.json();
}

export function getApprovedOrganizations() {
  return getPublicOrganizations();
}

export async function updateOrganizationProfile(patch: { orgName?: string; phone?: string; orgDesc?: string }): Promise<void> {
  const res = await fetch('/api/organization/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || 'تعذر تحديث الملف.');
  }
}

