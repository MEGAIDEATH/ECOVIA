import type { NextRequest } from 'next/server';

import { jsonOk, mapError } from '@/lib/api/http';
import { getSessionUserFromRequest, loadProfilesForUser } from '@/lib/auth/session';

/**
 * GET /api/session — the server's authoritative answer about who is signed in.
 * Returns the user, the role and both possible profiles. The browser never
 * decides its own identity or role.
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await getSessionUserFromRequest(request);
    if (!user) return jsonOk({ authenticated: false, user: null, specialist: null, organization: null });

    const { specialist, organization } = await loadProfilesForUser(user.id);
    return jsonOk({
      authenticated: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      specialist,
      organization,
    });
  } catch (error) {
    return mapError(error, 'session');
  }
}
