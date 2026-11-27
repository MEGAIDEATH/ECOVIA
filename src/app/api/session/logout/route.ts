import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { mapError } from '@/lib/api/http';
import { getAuth } from '@/lib/auth';
import { ACTIVE_ROLE_COOKIE } from '@/lib/auth/access';

/**
 * POST /api/session/logout — destroys the server session and clears the
 * session cookies Better Auth set (forwarding its own Set-Cookie headers, so
 * the `__Secure-` names used on HTTPS deployments are expired correctly).
 * Works for every account state. Used by the demo "fresh session" control;
 * the app's logout button uses the `logoutAction` Server Action.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const response = NextResponse.json({ ok: true });
    try {
      const result = await getAuth().api.signOut({ headers: request.headers, returnHeaders: true });
      for (const cookie of result.headers?.getSetCookie?.() ?? []) response.headers.append('set-cookie', cookie);
    } catch {
      // No valid session: nothing to revoke server-side.
    }
    response.cookies.set(ACTIVE_ROLE_COOKIE, '', { maxAge: 0, path: '/' });
    return response;
  } catch (error) {
    return mapError(error, 'session/logout');
  }
}
