import type { NextRequest } from 'next/server';

import { asString, jsonError, jsonOk, mapError } from '@/lib/api/http';
import { getAuth } from '@/lib/auth';

/**
 * POST /api/session/otp — requests a one-time code for the given email.
 * In development the code is the well-known `DEV_OTP_CODE` (123456 by default)
 * and is logged server-side; in production a random code is generated and the
 * delivery provider must be configured.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
    const email = asString(body?.email, 320)?.toLowerCase();
    if (!email || !email.includes('@')) return jsonError('البريد الإلكتروني غير صالح.', 400);

    await getAuth().api.sendVerificationOTP({
      body: { email, type: 'sign-in' },
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return mapError(error, 'session/otp');
  }
}
