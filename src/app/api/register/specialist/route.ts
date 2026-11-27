import { NextResponse, type NextRequest } from 'next/server';

import { jsonError, mapError, readJson } from '@/lib/api/http';
import { ACTIVE_ROLE_COOKIE } from '@/lib/auth/access';
import { getDb } from '@/db';
import { accountEvents } from '@/db/schema';
import { isOwnDocumentOfKind } from '@/repositories/documents';
import { requireUser } from '@/lib/auth/session';
import { createSpecialist, getSpecialistByUserId } from '@/repositories/profiles';
import { specialistRegistrationPayloadSchema } from '@/lib/validation/registration';

/**
 * POST /api/register/specialist — creates the specialist profile for the
 * signed-in account. The identity comes from the session (never from the body)
 * and the status is always `pending`: only an admin can approve an account.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await requireUser(request);
    const body = await readJson(request);
    if (!body) return jsonError('طلب غير صالح.', 400);

    const parsed = specialistRegistrationPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? 'البيانات غير مكتملة.', 400);
    }
    // An attached registration document must be the caller's own upload of the right kind.
    if (parsed.data.licenseDocId && !(await isOwnDocumentOfKind(parsed.data.licenseDocId, user.id, 'license'))) {
      return jsonError('تعذر استخدام المستند المرفق، ارفعه مرة أخرى.', 400);
    }

    const existing = await getSpecialistByUserId(user.id);
    if (existing) {
      return withContext({ status: 'existing', role: 'spec', accountStatus: existing.status, userId: user.id });
    }

    const created = await createSpecialist({
      userId: user.id,
      fullName: parsed.data.fullName,
      nationalId: parsed.data.nationalId,
      email: null,
      phone: parsed.data.phone,
      license: parsed.data.license,
      issueDate: parsed.data.issueDate ?? null,
      licenseDocumentId: parsed.data.licenseDocId,
    });

    await getDb().insert(accountEvents).values({
      actorUserId: user.id,
      action: 'account.registered',
      targetKind: 'specialist',
      targetId: created.id,
    });

    return withContext({
      status: 'created',
      role: 'spec',
      accountStatus: created.status,
      userId: user.id,
    });
  } catch (error) {
    return mapError(error, 'register/specialist');
  }
}

/** Registration selects the new profile as the active context (validated again on every request). */
function withContext(payload: Record<string, unknown>): Response {
  const response = NextResponse.json(payload);
  response.cookies.set(ACTIVE_ROLE_COOKIE, 'spec', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
