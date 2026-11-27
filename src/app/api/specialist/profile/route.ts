import type { NextRequest } from 'next/server';

import { jsonError, jsonOk, mapError, readJson } from '@/lib/api/http';
import { requireRole } from '@/lib/auth/policies';
import { cvSchema } from '@/lib/validation/forms';
import { parseImageChange, parseOptionalRegion } from '@/lib/validation/profile';
import { isOwnDocumentOfKind, type DocumentKind } from '@/repositories/documents';
import { getSpecialistByUserId, updateSpecialistProfile } from '@/repositories/profiles';

/**
 * GET   /api/specialist/profile — the caller's own specialist profile / CV.
 * PATCH /api/specialist/profile — updates the caller's own CV fields.
 * Both work for PENDING accounts (they maintain their CV while waiting for
 * approval). The profile is always the session user's — no id is accepted.
 * Attached files must be the caller's own uploads of the right kind.
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { profile } = await requireRole('spec', request);
    return jsonOk(profile);
  } catch (error) {
    return mapError(error, 'specialist/profile:get');
  }
}

async function documentChange(
  raw: unknown,
  ownerUserId: string,
  kind: DocumentKind,
): Promise<{ ok: true; value: string | null | undefined } | { ok: false }> {
  const change = parseImageChange(raw === null ? 'remove' : raw);
  if (!change) return { ok: false };
  if (change.kind === 'keep') return { ok: true, value: undefined };
  if (change.kind === 'remove') return { ok: true, value: null };
  return (await isOwnDocumentOfKind(change.id, ownerUserId, kind)) ? { ok: true, value: change.id } : { ok: false };
}

export async function PATCH(request: NextRequest): Promise<Response> {
  try {
    const { account } = await requireRole('spec', request);
    const body = await readJson(request);
    if (!body) return jsonError('طلب غير صالح.', 400);

    const parsed = cvSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة.', 400);

    const region = parseOptionalRegion(body.region);
    if (region === undefined && body.region !== undefined) return jsonError('اختر منطقة صحيحة من القائمة.', 400);

    const [image, resume] = await Promise.all([
      documentChange(body.profileImageId, account.user.id, 'profile_image'),
      documentChange(body.resumeDocumentId, account.user.id, 'resume'),
    ]);
    if (!image.ok || !resume.ok) return jsonError('تعذر استخدام الملف المرفق، ارفعه مرة أخرى.', 400);

    await updateSpecialistProfile(account.user.id, {
      fullName: parsed.data.fullName || undefined,
      email: parsed.data.email === '' ? null : parsed.data.email,
      phone: parsed.data.phone || undefined,
      edu: parsed.data.edu || null,
      city: parsed.data.city || null,
      region,
      years: parsed.data.years || null,
      exp: parsed.data.exp || null,
      portfolio: parsed.data.portfolio || null,
      profileImageId: image.value,
      resumeDocumentId: resume.value,
    });

    return jsonOk(await getSpecialistByUserId(account.user.id));
  } catch (error) {
    return mapError(error, 'specialist/profile:patch');
  }
}
