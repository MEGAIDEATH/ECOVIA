import type { NextRequest } from 'next/server';

import { getSessionUserFromRequest } from '@/lib/auth/session';
import { jsonOk } from '@/lib/api/http';

/**
 * GET /api/admin/session — returns whether the current user is an admin.
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await getSessionUserFromRequest(request);
    return jsonOk({ authenticated: Boolean(user && user.role === 'admin') });
  } catch {
    return jsonOk({ authenticated: false });
  }
}
