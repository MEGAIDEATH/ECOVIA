import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { jsonOk, mapError } from '@/lib/api/http';
import { getAuth } from '@/lib/auth';

/**
 * POST /api/session/logout — destroys the server session and clears the
 * session cookie. Used by "تسجيل خروج مؤقت" and by the development-only
 * "start a fresh demo session" control.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    await getAuth().api.signOut({ headers: request.headers, asResponse: true });

    const response = NextResponse.json({ ok: true });
    // Expire the session cookie for this browser as well.
    response.cookies.set('better-auth.session_token', '', {
      maxAge: 0,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    });
    return response;
  } catch (error) {
    return mapError(error, 'session/logout');
  }
}

export function GET(): Response {
  return jsonOk({ ok: false });
}
