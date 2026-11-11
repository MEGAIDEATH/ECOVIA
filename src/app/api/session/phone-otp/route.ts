import type { NextRequest } from 'next/server';

import { asString, jsonError, jsonOk, mapError, OTP_UNAVAILABLE_MESSAGE } from '@/lib/api/http';
import { getAuth } from '@/lib/auth';
import { canIssueOtp, demoOtpCode, otpModeFor } from '@/lib/auth/otp';
import { enforceOtpRateLimit } from '@/lib/auth/rateLimit';

/** POST /api/session/phone-otp — same contract as /api/session/otp, for phones. */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = (await request.json().catch(() => null)) as { phoneNumber?: unknown } | null;
    const phoneNumber = asString(body?.phoneNumber, 32)?.trim();
    if (!phoneNumber) return jsonError('رقم الجوال غير صالح.', 400);
    if (!canIssueOtp(phoneNumber)) return jsonError(OTP_UNAVAILABLE_MESSAGE, 503);

    await enforceOtpRateLimit('send', phoneNumber, request.headers);
    await getAuth().api.sendPhoneNumberOTP({
      body: { phoneNumber },
    });

    const mode = otpModeFor(phoneNumber);
    return jsonOk(mode === 'demo' ? { ok: true, mode, demoCode: demoOtpCode() } : { ok: true, mode });
  } catch (error) {
    return mapError(error, 'session/phone-otp');
  }
}
