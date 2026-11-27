import type { NextRequest } from 'next/server';

import { jsonOk, mapError } from '@/lib/api/http';
import { requireChatActor } from '@/lib/chat/actor';
import { listConversationsForUser } from '@/repositories/chat';

/** GET /api/chat/conversations — the caller's own conversations (approved profiles only). */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const actor = await requireChatActor(request);
    return jsonOk(await listConversationsForUser(actor));
  } catch (error) {
    return mapError(error, 'chat/conversations');
  }
}
