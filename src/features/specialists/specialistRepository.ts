export interface SpecialistProfilePatch {
  fullName?: string;
  email?: string;
  phone?: string;
  edu?: string | null;
  city?: string | null;
  /** Region code (`src/lib/regions.ts`); '' clears it. */
  region?: string;
  years?: string | null;
  exp?: string | null;
  portfolio?: string | null;
  profilePicId?: string | null;
  resumeFileId?: string | null;
}

/** Updates the signed-in specialist's own CV (the server resolves the profile from the session). */
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
