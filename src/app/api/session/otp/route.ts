import type { NextRequest } from 'next/server';

import { asString, jsonError, jsonOk, mapError, OTP_UNAVAILABLE_MESSAGE } from '@/lib/api/http';
import { getAuth } from '@/lib/auth';
import { canIssueOtp, demoOtpCode, otpModeFor } from '@/lib/auth/otp';
import { enforceOtpRateLimit } from '@/lib/auth/rateLimit';

/**
 * POST /api/session/otp — requests a one-time code for the given email.
 *
 * Response: `{ ok: true, mode: 'real' | 'demo', demoCode? }`. `demo` is
 * returned only for identities on the server-side demo allowlist; nothing is
 * sent to them and the UI shows the labelled test code instead.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
    const email = asString(body?.email, 320)?.toLowerCase();
    if (!email || !email.includes('@')) return jsonError('البريد الإلكتروني غير صالح.', 400);
    if (!canIssueOtp(email)) return jsonError(OTP_UNAVAILABLE_MESSAGE, 503);

    await enforceOtpRateLimit('send', email, request.headers);
    await getAuth().api.sendVerificationOTP({
      body: { email, type: 'sign-in' },
    });

    const mode = otpModeFor(email);
    return jsonOk(mode === 'demo' ? { ok: true, mode, demoCode: demoOtpCode() } : { ok: true, mode });
  } catch (error) {
    return mapError(error, 'session/otp');
  }
}
