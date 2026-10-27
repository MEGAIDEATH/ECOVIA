import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { asString, jsonError, mapError } from '@/lib/api/http';
import { getAuth } from '@/lib/auth';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = (await request.json().catch(() => null)) as
      | { phoneNumber?: unknown; code?: unknown }
      | null;
    const phoneNumber = asString(body?.phoneNumber, 32)?.trim();
    const code = asString(body?.code, 12);
    if (!phoneNumber) return jsonError('رقم الجوال غير صالح.', 400);
    if (!code || !/^\d{6}$/.test(code)) return jsonError('أدخل رمز التحقق المكون من 6 أرقام', 400);

    const { headers: authHeaders, response } = await getAuth().api.verifyPhoneNumber({
      body: { phoneNumber, code, disableSession: false },
      returnHeaders: true,
    });

    if (!response?.status) return jsonError('رمز التحقق غير صحيح!', 401);

    const result = NextResponse.json({ ok: true });
    for (const cookie of authHeaders?.getSetCookie?.() ?? []) {
      result.headers.append('set-cookie', cookie);
    }
    return result;
  } catch (error) {
    if ((error as { status?: unknown }).status !== undefined) {
      return jsonError('رمز التحقق غير صحيح!', 401);
    }
    return mapError(error, 'session/phone-verify');
  }
}