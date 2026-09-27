import type { NextRequest } from 'next/server';

import { jsonError, jsonOk, mapError } from '@/lib/api/http';
import { requireUser } from '@/lib/auth/session';
import { getOrganizationByUserId } from '@/repositories/profiles';

/**
 * GET /api/organization/profile — returns current user's organization profile.
 * The identity comes from the session, never from a query parameter.
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireUser(request);
    const profile = await getOrganizationByUserId(user.id);
    if (!profile) return jsonError('الملف الشخصي غير موجود.', 404);
    return jsonOk(profile);
  } catch (error) {
    return mapError(error, 'organization/profile:get');
  }
}