import type { NextRequest } from 'next/server';

import { asString, jsonError, jsonOk, mapError, readJson } from '@/lib/api/http';
import { getAuth } from '@/lib/auth';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await readJson(request);
    if (!body) return jsonError('طلب غير صالح.', 400);

    const channel = asString(body.channel, 16);
    const identifier = asString(body.identifier, 320)?.trim();
    if (!identifier) return jsonError('المعرف غير صالح.', 400);

    if (channel === 'phone') {
      await getAuth().api.requestPasswordResetPhoneNumber({
        body: { phoneNumber: identifier },
      });
      return jsonOk({ ok: true });
    }

    if (channel === 'email') {
      const email = identifier.toLowerCase();
      await getAuth().api.requestPasswordResetEmailOTP({
        body: { email },
      });
      return jsonOk({ ok: true });
    }

    return jsonError('قناة غير مدعومة.', 400);
  } catch (error) {
    return mapError(error, 'password/forgot/request');
  }
}