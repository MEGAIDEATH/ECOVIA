import type { NextRequest } from 'next/server';

import { jsonError, jsonOk, mapError, readJson } from '@/lib/api/http';
import { requireUser } from '@/lib/auth/session';
import { getSpecialistByUserId, updateSpecialistProfile } from '@/repositories/profiles';
import { cvSchema } from '@/lib/validation/forms';

/**
 * GET /api/specialist/profile — returns current user's specialist profile.
 * PATCH /api/specialist/profile — updates allowed CV fields.
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireUser(request);
    const profile = await getSpecialistByUserId(user.id);
    if (!profile) return jsonError('الملف الشخصي غير موجود.', 404);
    return jsonOk(profile);
  } catch (error) {
    return mapError(error, 'specialist/profile:get');
  }
}

export async function PATCH(request: NextRequest): Promise<Response> {
  try {
    const user = await requireUser(request);
    const body = await readJson(request);
    if (!body) return jsonError('طلب غير صالح.', 400);

    const parsed = cvSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة.', 400);
    }

    await updateSpecialistProfile(user.id, {
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      edu: parsed.data.edu ?? null,
      years: parsed.data.years != null ? String(parsed.data.years) : null,
      exp: parsed.data.exp ?? null,
      portfolio: parsed.data.portfolio ?? null,
      profileImageId: typeof body.profileImageId === 'string' ? body.profileImageId : undefined,
      resumeDocumentId: typeof body.resumeDocumentId === 'string' ? body.resumeDocumentId : undefined,
    });

    const updated = await getSpecialistByUserId(user.id);
    return jsonOk(updated);
  } catch (error) {
    return mapError(error, 'specialist/profile:patch');
  }
}
