import type { NextRequest } from 'next/server';

import { asString, jsonError, jsonOk, mapError, readJson } from '@/lib/api/http';
import { getAuth } from '@/lib/auth';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await readJson(request);
    if (!body) return jsonError('طلب غير صالح.', 400);

    const channel = asString(body.channel, 16);
    const identifier = asString(body.identifier, 320)?.trim();
    const otp = asString(body.otp, 12);
    const newPassword = asString(body.newPassword, 128);
    if (!identifier || !otp || !newPassword) return jsonError('بيانات غير مكتملة.', 400);
    if (newPassword.length < 8) return jsonError('كلمة المرور يجب أن تكون 8 أحرف على الأقل.', 400);

    if (channel === 'phone') {
      await getAuth().api.resetPasswordPhoneNumber({
        body: { phoneNumber: identifier, otp, newPassword },
      });
      return jsonOk({ ok: true });
    }

    if (channel === 'email') {
      const email = identifier.toLowerCase();
      await getAuth().api.resetPasswordEmailOTP({
        body: { email, otp, password: newPassword },
      });
      return jsonOk({ ok: true });
    }

    return jsonError('قناة غير مدعومة.', 400);
  } catch (error) {
    return mapError(error, 'password/forgot/reset');
  }
}