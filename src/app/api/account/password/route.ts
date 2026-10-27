import type { NextRequest } from 'next/server';

import { jsonError, jsonOk, mapError, readJson, asString } from '@/lib/api/http';
import { requireUser } from '@/lib/auth/session';
import { getAuth } from '@/lib/auth';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await requireUser(request);
    void user;

    const body = await readJson(request);
    if (!body) return jsonError('طلب غير صالح.', 400);

    const newPassword = asString(body.newPassword, 128);
    const confirmPassword = asString(body.confirmPassword, 128);

    if (!newPassword || newPassword.length < 8) {
      return jsonError('كلمة المرور يجب أن تكون 8 أحرف على الأقل.', 400);
    }
    if (newPassword !== confirmPassword) {
      return jsonError('تأكيد كلمة المرور غير متطابق.', 400);
    }

    await getAuth().api.setPassword({
      body: { newPassword },
      headers: request.headers,
    });

    return jsonOk({ status: 'created' });
  } catch (error) {
    // Better Auth rejects password replacement when a password already exists.
    // Keep the response generic so account state is not disclosed.
    const message = error instanceof Error ? error.message : '';
    if (message.includes('PASSWORD_ALREADY_SET') || message.toLowerCase().includes('already set')) {
      return jsonError('لا يمكن إعداد كلمة المرور لهذا الحساب.', 409);
    }
    return mapError(error, 'account/password');
  }
}
