import type { NextRequest } from 'next/server';

import { asString, jsonError, jsonOk, mapError, readJson } from '@/lib/api/http';
import { requireUser } from '@/lib/auth/session';
import { signContract } from '@/repositories/chat';

/**
 * POST /api/chat/contracts/sign
 * Specialist signs an existing contract.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await requireUser(request);
    const body = await readJson(request);
    if (!body) return jsonError('طلب غير صالح.', 400);

    const messageId = asString(body.messageId, 64);
    const signature = asString(body.signature, 100);

    if (!messageId || !signature) {
      return jsonError('معرّف العقد والتوقيع مطلوبان.', 400);
    }

    await signContract(messageId, signature, user.id);
    return jsonOk({ ok: true });
  } catch (error) {
    return mapError(error, 'chat/contracts/sign');
  }
}
