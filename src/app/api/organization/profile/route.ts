import type { NextRequest } from 'next/server';

import { jsonError, jsonOk, mapError, readJson } from '@/lib/api/http';
import { requireRole } from '@/lib/auth/policies';
import { parseOrganizationProfileInput } from '@/lib/validation/profile';
import { isOwnDocumentOfKind } from '@/repositories/documents';
import { getOrganizationByUserId, updateOrganizationProfile } from '@/repositories/profiles';

/**
 * GET   /api/organization/profile — the caller's own facility profile.
 * PATCH /api/organization/profile — same fields and rules as the profile
 *       page's Server Action (pending facilities allowed). The registered
 *       name and CR number are not editable.
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { profile } = await requireRole('org', request);
    return jsonOk(profile);
  } catch (error) {
    return mapError(error, 'organization/profile:get');
  }
}

export async function PATCH(request: NextRequest): Promise<Response> {
  try {
    const { account, profile } = await requireRole('org', request);
    const body = await readJson(request);
    if (!body) return jsonError('طلب غير صالح.', 400);
    const parsed = parseOrganizationProfileInput({
      phone: body.phone ?? profile.phone,
      orgDesc: body.orgDesc ?? profile.orgDesc,
      businessFields: Array.isArray(body.businessFields) ? body.businessFields : profile.businessFields ?? [],
      website: body.website ?? profile.website ?? '',
      profileImageId: body.profileImageId ?? 'keep',
    });
    if (!parsed.ok) return Response.json({ error: parsed.error, fieldErrors: parsed.fieldErrors }, { status: 400 });
    const { image, ...fields } = parsed.data;
    if (image.kind === 'set' && !(await isOwnDocumentOfKind(image.id, account.user.id, 'profile_image'))) {
      return jsonError('تعذر استخدام الصورة المرفوعة.', 400);
    }
    await updateOrganizationProfile(account.user.id, {
      ...fields,
      ...(image.kind === 'set' ? { profileImageId: image.id } : image.kind === 'remove' ? { profileImageId: null } : {}),
    });
    return jsonOk(await getOrganizationByUserId(account.user.id));
  } catch (error) {
    return mapError(error, 'organization/profile:patch');
  }
}
