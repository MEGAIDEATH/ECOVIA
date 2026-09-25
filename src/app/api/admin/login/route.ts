import { NextResponse, type NextRequest } from 'next/server';

import { createAdminSessionToken, verifyAdminPassword } from '@/lib/admin/session';
import { jsonError, sessionCookieOptions } from '@/lib/admin/apiAuth';

/**
 * POST /api/admin/login — server-side validation of the admin password.
 * The legacy app compared against a hard-coded '1234' in browser JS; here the
 * credential only exists in the environment and on the server.
 */
export async function POST(request: NextRequest): Promise<Response> {
  if (!process.env.ADMIN_PASSWORD) {
    console.error('[admin/login] ADMIN_PASSWORD is not configured.');
    return jsonError('خدمة الدخول غير مهيأة حالياً.', 503);
  }

  let password: unknown;
  try {
    const body: unknown = await request.json();
    if (body && typeof body === 'object' && 'password' in body) {
      password = (body as { password: unknown }).password;
    }
  } catch {
    return jsonError('طلب غير صالح.', 400);
  }

  if (typeof password !== 'string' || password.length === 0) {
    return jsonError('رمز الدخول غير صحيح!', 401);
  }

  if (!verifyAdminPassword(password)) {
    return jsonError('رمز الدخول غير صحيح!', 401);
  }

  const cookie = sessionCookieOptions();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookie.name, createAdminSessionToken(), {
    maxAge: cookie.maxAge,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    secure: cookie.secure,
    path: cookie.path,
  });
  return response;
}
