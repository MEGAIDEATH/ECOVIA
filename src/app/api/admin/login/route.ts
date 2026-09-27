import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { asString, jsonError, mapError, readJson } from '@/lib/api/http';
import { getAuth } from '@/lib/auth';
import { getUserByEmail } from '@/repositories/users';

/**
 * POST /api/admin/login
 * Administrative sign-in through Better Auth's email/password flow.
 *
 * The account must already exist in the database (created by
 * `npm run db:seed`) and carry the server-authoritative `admin` role.
 * `ADMIN_EMAIL` / `ADMIN_PASSWORD` are seed-time configuration only and are
 * never read by this route — every login is validated by Better Auth against
 * the stored password hash, then authorized from the database role column.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await readJson(request);
    if (!body) return jsonError('طلب غير صالح.', 400);

    const email = asString(body.email, 320)?.toLowerCase();
    const password = asString(body.password, 200);

    if (!email || !email.includes('@')) return jsonError('البريد الإلكتروني غير صالح.', 400);
    if (!password) return jsonError('رمز الدخول غير صحيح!', 401);

    let authHeaders: Headers;
    try {
      const authRes = await getAuth().api.signInEmail({
        body: { email, password },
        returnHeaders: true,
      });
      if (!authRes.response?.user) return jsonError('رمز الدخول غير صحيح!', 401);
      authHeaders = authRes.headers;
    } catch {
      // Better Auth rejected the credentials — identical message to the legacy
      // flow, and no distinction between "unknown email" and "wrong password".
      return jsonError('رمز الدخول غير صحيح!', 401);
    }

    // Authorization happens only after the credentials verified successfully.
    // The role comes from the database, never from the request payload.
    const dbUser = await getUserByEmail(email);
    if (!dbUser || dbUser.role !== 'admin') {
      // The session cookies in `authHeaders` are deliberately NOT forwarded,
      // so a non-admin never receives an authenticated session from this route.
      return jsonError('غير مصرح بالوصول للإدارة.', 403);
    }

    const response = NextResponse.json({ ok: true });
    for (const cookie of authHeaders.getSetCookie?.() ?? []) {
      response.headers.append('set-cookie', cookie);
    }
    return response;
  } catch (error) {
    return mapError(error, 'admin/login');
  }
}
