import type { NextRequest } from 'next/server';

import { jsonError, jsonOk, mapError, readJson } from '@/lib/api/http';
import { consumeRateLimit, RateLimitError } from '@/lib/auth/rateLimit';
import { requireChatActor } from '@/lib/chat/actor';
import { listMessages, MESSAGE_MAX_LENGTH, sendMessage } from '@/repositories/chat';

/** 30 messages per user per minute (DB-backed, shared by every instance). */
const SEND_RATE_LIMIT = { scope: 'chat-send-user', max: 30, windowSeconds: 60 };

/**
 * GET  /api/chat/messages?chatId=… — latest messages (participants only).
 * POST /api/chat/messages { chatId, text } — plain text message; the sender
 *      is always the session user. Contracts are no longer created from chat:
 *      they are prepared from a selected offer on the request page.
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const actor = await requireChatActor(request);
    const chatId = request.nextUrl.searchParams.get('chatId');
    if (!chatId || chatId.length > 160) return jsonError('معرّف المحادثة مطلوب.', 400);
    return jsonOk(await listMessages(chatId, actor));
  } catch (error) {
    return mapError(error, 'chat/messages:get');
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const actor = await requireChatActor(request);
    const body = await readJson(request);
    if (!body) return jsonError('طلب غير صالح.', 400);

    const chatId = typeof body.chatId === 'string' ? body.chatId.trim() : '';
    if (!chatId || chatId.length > 160) return jsonError('معرّف المحادثة مطلوب.', 400);
    if (body.isContract) {
      return jsonError('تُعدّ العقود من صفحة الطلب بعد اختيار عرض الأخصائي.', 400);
    }
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) return jsonError('نص الرسالة مطلوب.', 400);
    if (text.length > MESSAGE_MAX_LENGTH) return jsonError(`الرسالة أطول من ${MESSAGE_MAX_LENGTH} حرف.`, 400);
    if (!(await consumeRateLimit(SEND_RATE_LIMIT, actor.userId))) throw new RateLimitError();

    return jsonOk(await sendMessage(chatId, actor, text));
  } catch (error) {
    return mapError(error, 'chat/messages:post');
  }
}
