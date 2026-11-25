import { NextResponse, type NextRequest } from 'next/server';

import { jsonError, mapError, readJson } from '@/lib/api/http';
import { ACTIVE_ROLE_COOKIE } from '@/lib/auth/access';
import { isOwnDocumentOfKind } from '@/repositories/documents';
import { requireUser } from '@/lib/auth/session';
import { createOrganization, getOrganizationByUserId } from '@/repositories/profiles';
import { organizationRegistrationPayloadSchema } from '@/lib/validation/registration';

/**
 * POST /api/register/organization — creates the organization profile for the
 * signed-in account. Identity comes from the session; status is always
 * `pending` until an administrator approves it.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await requireUser(request);
    const body = await readJson(request);
    if (!body) return jsonError('طلب غير صالح.', 400);

    const parsed = organizationRegistrationPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? 'البيانات غير مكتملة.', 400);
    }
    // An attached registration document must be the caller's own upload of the right kind.
    if (parsed.data.crDocId && !(await isOwnDocumentOfKind(parsed.data.crDocId, user.id, 'commercial_registration'))) {
      return jsonError('تعذر استخدام المستند المرفق، ارفعه مرة أخرى.', 400);
    }

    const existing = await getOrganizationByUserId(user.id);
    if (existing) {
      return withContext({
        status: 'existing',
        role: 'org',
        accountStatus: existing.status,
        userId: user.id,
      });
    }

    const created = await createOrganization({
      userId: user.id,
      orgName: parsed.data.orgName,
      crNumber: parsed.data.crNumber,
      phone: parsed.data.phone,
      orgDesc: parsed.data.orgDesc,
      crDocumentId: parsed.data.crDocId,
    });

    return withContext({ status: 'created', role: 'org', accountStatus: created.status, userId: user.id });
  } catch (error) {
    return mapError(error, 'register/organization');
  }
}

/** Registration selects the new profile as the active context (validated again on every request). */
function withContext(payload: Record<string, unknown>): Response {
  const response = NextResponse.json(payload);
  response.cookies.set(ACTIVE_ROLE_COOKIE, 'org', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
