import { NextResponse } from 'next/server';

import { jsonError, sessionCookieOptions } from '@/lib/admin/apiAuth';

/** POST /api/admin/logout — clears the admin session cookie. */
export async function POST(): Promise<Response> {
  const cookie = sessionCookieOptions();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookie.name, '', {
    maxAge: 0,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    secure: cookie.secure,
    path: cookie.path,
  });
  return response;
}

export function GET(): Response {
  return jsonError('Method not allowed.', 405);
}
