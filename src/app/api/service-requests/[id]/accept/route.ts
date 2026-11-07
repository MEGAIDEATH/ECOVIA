import type { NextRequest } from 'next/server';

import { jsonError, jsonOk, mapError } from '@/lib/api/http';
import { requireUser } from '@/lib/auth/session';
import { getDb } from '@/db';
import { organizations, specialists } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { acceptServiceRequest, getServiceRequestById } from '@/repositories/serviceRequests';
import { resolveConversation } from '@/repositories/chat';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const db = getDb();
    const specRows = await db.select().from(specialists).where(eq(specialists.userId, user.id)).limit(1);
    if (!specRows[0] || specRows[0].status !== 'approved') return jsonError('غير مصرح.', 403);
    const sr = await getServiceRequestById(id);
    if (!sr) return jsonError('غير موجود.', 404);
    if (sr.status !== 'pending') return jsonError('الطلب غير متاح.', 400);
    const accepted = await acceptServiceRequest(id, specRows[0].id);
    if (!accepted) return jsonError('تعذر قبول الطلب.', 409);
    const orgRows = await db.select().from(organizations).where(eq(organizations.id, accepted.organizationId)).limit(1);
    if (orgRows[0]) {
      const conv = await resolveConversation(
        `chat_${orgRows[0].userId}_${user.id}`,
        user.id,
      );
      await (await import('@/repositories/serviceRequests')).setServiceRequestConversation(id, conv.id);
      accepted.conversationId = conv.id;
    }
    return jsonOk(accepted);
  } catch (error) {
    return mapError(error, 'service-requests:accept');
  }
}
