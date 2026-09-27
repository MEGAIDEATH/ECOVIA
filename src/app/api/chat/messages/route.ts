import type { NextRequest } from 'next/server';

import { asString, jsonError, jsonOk, mapError, readJson } from '@/lib/api/http';
import { requireUser } from '@/lib/auth/session';
import { listMessages, sendMessage, createContractMessage } from '@/repositories/chat';

/**
 * GET /api/chat/messages?chatId=...
 * POST /api/chat/messages
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireUser(request);
    const chatId = request.nextUrl.searchParams.get('chatId');
    if (!chatId) return jsonError('معرّف المحادثة مطلوب.', 400);

    const messages = await listMessages(chatId, user.id);
    return jsonOk(messages);
  } catch (error) {
    return mapError(error, 'chat/messages:get');
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await requireUser(request);
    const body = await readJson(request);
    if (!body) return jsonError('طلب غير صالح.', 400);

    const chatId = asString(body.chatId, 128);
    if (!chatId) return jsonError('معرّف المحادثة مطلوب.', 400);

    // If it's a contract message
    if (body.isContract && body.contractData && typeof body.contractData === 'object') {
      const cd = body.contractData as Record<string, unknown>;
      const title = asString(cd.title, 200) || 'عقد عمل';
      const value = asString(cd.value, 50) || '0';
      const duration = asString(cd.duration, 50) || 'شهر';
      const orgSig = asString(cd.orgSig, 100) || user.name;

      const message = await createContractMessage(chatId, user.id, {
        title,
        value,
        duration,
        orgSig,
      });
      return jsonOk(message);
    }

    // Plain message
    const text = asString(body.text, 5000);
    if (!text) return jsonError('نص الرسالة مطلوب.', 400);

    const message = await sendMessage({
      chatId,
      senderUserId: user.id,
      text,
    });
    return jsonOk(message);
  } catch (error) {
    return mapError(error, 'chat/messages:post');
  }
}
