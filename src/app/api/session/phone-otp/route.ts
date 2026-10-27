import type { NextRequest } from 'next/server';

import { asString, jsonError, jsonOk, mapError } from '@/lib/api/http';
import { getAuth } from '@/lib/auth';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = (await request.json().catch(() => null)) as { phoneNumber?: unknown } | null;
    const phoneNumber = asString(body?.phoneNumber, 32)?.trim();
    if (!phoneNumber) return jsonError('رقم الجوال غير صالح.', 400);

    await getAuth().api.sendPhoneNumberOTP({
      body: { phoneNumber },
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return mapError(error, 'session/phone-otp');
  }
}