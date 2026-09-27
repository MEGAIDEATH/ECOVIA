import type { NextRequest } from 'next/server';

import { jsonError, jsonOk, mapError, readJson } from '@/lib/api/http';
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

    const existing = await getSpecialistByUserId(user.id);
    if (existing) {
      return jsonOk({ status: 'existing', role: 'spec', accountStatus: existing.status, userId: user.id });
    }

    const created = await createSpecialist({
      userId: user.id,
      fullName: parsed.data.fullName,
      nationalId: parsed.data.nationalId,
      email: parsed.data.email,
      phone: parsed.data.phone,
      license: parsed.data.license,
      issueDate: parsed.data.issueDate ?? null,
      licenseDocumentId: parsed.data.licenseDocId,
    });

    return jsonOk({
      status: 'created',
      role: 'spec',
      accountStatus: created.status,
      userId: user.id,
    });
  } catch (error) {
    return mapError(error, 'register/specialist');
  }
}
