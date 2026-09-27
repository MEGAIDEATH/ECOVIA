import type { NextRequest } from 'next/server';

import { jsonError, jsonOk, mapError, readJson } from '@/lib/api/http';
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

    const existing = await getOrganizationByUserId(user.id);
    if (existing) {
      return jsonOk({
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

    return jsonOk({ status: 'created', role: 'org', accountStatus: created.status, userId: user.id });
  } catch (error) {
    return mapError(error, 'register/organization');
  }
}
