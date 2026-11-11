import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { asString, jsonError, mapError, otpVerificationError } from '@/lib/api/http';
import { getAuth } from '@/lib/auth';
import { enforceOtpRateLimit } from '@/lib/auth/rateLimit';
import { loadProfilesForUser } from '@/lib/auth/session';
import { getUserByEmail } from '@/repositories/users';

/**
 * POST /api/session/verify — verifies the one-time code and, on success,
 * creates the database-backed session (Better Auth sets the session cookie).
 *
 * A successful verification also signs up the email when it does not exist
 * yet, which is exactly what the registration flow needs: the code proves
 * address ownership and the profile row is created afterwards.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = (await request.json().catch(() => null)) as
      | { email?: unknown; code?: unknown }
      | null;
    const email = asString(body?.email, 320)?.toLowerCase();
    const code = asString(body?.code, 12);
    if (!email || !email.includes('@')) return jsonError('البريد الإلكتروني غير صالح.', 400);
    if (!code || !/^\d{6}$/.test(code)) return jsonError('أدخل رمز التحقق المكون من 6 أرقام', 400);

    await enforceOtpRateLimit('verify', email, request.headers);
    const { headers: authHeaders, response } = await getAuth().api.signInEmailOTP({
      body: { email, otp: code },
      returnHeaders: true,
    });

    if (!response?.user) return jsonError('رمز التحقق غير صحيح!', 401);

    // Authoritative account state is read from PostgreSQL (role included).
    const account = await getUserByEmail(email);
    if (!account) return jsonError('تعذر إنشاء الجلسة، حاول مرة أخرى.', 500);

    const { specialist, organization } = await loadProfilesForUser(account.id);

    const result = NextResponse.json({
      ok: true,
      user: { id: account.id, email: account.email, name: account.name, role: account.role },
      specialist,
      organization,
    });
    for (const cookie of authHeaders?.getSetCookie?.() ?? []) {
      result.headers.append('set-cookie', cookie);
    }
    return result;
  } catch (error) {
    // Better Auth raises an API error (with a `status`) for an invalid,
    // expired or exhausted code — surface Arabic messages, never internals.
    return otpVerificationError(error) ?? mapError(error, 'session/verify');
  }
}
