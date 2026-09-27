import { getPublicSpecialists } from '@/features/directory/directoryService';
import type { Specialist } from '@/types';

export interface SpecialistProfilePatch {
  fullName?: string;
  email?: string;
  phone?: string;
  edu?: string | null;
  years?: string | null;
  exp?: string | null;
  portfolio?: string | null;
  profilePicId?: string | null;
  resumeFileId?: string | null;
}

/**
 * The signed-in specialist's own profile (resolved server-side from the
 * session — no id is passed from the browser).
 */
export async function getOwnSpecialist(): Promise<Specialist | null> {
  const res = await fetch('/api/specialist/profile');
  if (!res.ok) return null;
  return res.json();
}

export function getApprovedSpecialists() {
  return getPublicSpecialists();
}

export async function updateSpecialistProfile(patch: SpecialistProfilePatch): Promise<void> {
  const { profilePicId, resumeFileId, ...rest } = patch;
  // `/api/specialist/profile` names these after the database columns.
  const body: Record<string, unknown> = { ...rest };
  if (profilePicId !== undefined) body.profileImageId = profilePicId;
  if (resumeFileId !== undefined) body.resumeDocumentId = resumeFileId;

  const res = await fetch('/api/specialist/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || 'تعذر تحديث الملف الشخصي.');
  }
}
