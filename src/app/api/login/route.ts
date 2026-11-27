import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { asString, jsonError, mapError, readJson } from '@/lib/api/http';
import { getAuth } from '@/lib/auth';
import { assertLoginAllowed, recordLoginFailure } from '@/lib/auth/rateLimit';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await readJson(request);
    if (!body) return jsonError('طلب غير صالح.', 400);

    const identifier = asString(body.identifier, 320);
    const password = asString(body.password, 200);
    if (!identifier || !password) return jsonError('بيانات الدخول غير صحيحة.', 401);
    await assertLoginAllowed(identifier.toLowerCase(), request.headers);

    let authHeaders: Headers;
    try {
      if (identifier.includes('@')) {
        const email = identifier.trim().toLowerCase();
        const authRes = await getAuth().api.signInEmail({
          body: { email, password },
          returnHeaders: true,
        });
        if (!authRes.response?.user) throw new Error('no user');
        authHeaders = authRes.headers;
      } else {
        const phoneNumber = identifier.trim();
        const authRes = await getAuth().api.signInPhoneNumber({
          body: { phoneNumber, password },
          returnHeaders: true,
        });
        if (!authRes.response?.user) throw new Error('no user');
        authHeaders = authRes.headers;
      }
    } catch {
      await recordLoginFailure(identifier.toLowerCase(), request.headers);
      return jsonError('بيانات الدخول غير صحيحة.', 401);
    }

    const response = NextResponse.json({ ok: true });
    for (const cookie of authHeaders.getSetCookie?.() ?? []) {
      response.headers.append('set-cookie', cookie);
    }
    return response;
  } catch (error) {
    return mapError(error, 'login');
  }
}
