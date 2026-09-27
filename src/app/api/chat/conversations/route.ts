import type { NextRequest } from 'next/server';

import { jsonOk, mapError } from '@/lib/api/http';
import { requireUser } from '@/lib/auth/session';
import { listConversationsForUser } from '@/repositories/chat';

/**
 * GET /api/chat/conversations — returns all active conversations for current user.
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireUser(request);
    const conversations = await listConversationsForUser(user.id);
    return jsonOk(conversations);
  } catch (error) {
    return mapError(error, 'chat/conversations');
  }
}
