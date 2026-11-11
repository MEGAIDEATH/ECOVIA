import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';

import { getDb } from '@/db';
import { specialists } from '@/db/schema';
import { asString, jsonError, jsonOk, mapError, readJson } from '@/lib/api/http';
import { requireUser } from '@/lib/auth/session';
import { declineServiceRequest, getServiceRequestById } from '@/repositories/serviceRequests';

/**
 * POST /api/service-requests/[id]/reject — a specialist declines a published
 * request for themselves. The request stays open for every other specialist
 * (path kept for API compatibility; it used to close the request globally).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const specRows = await getDb().select().from(specialists).where(eq(specialists.userId, user.id)).limit(1);
    if (!specRows[0] || specRows[0].status !== 'approved') return jsonError('غير مصرح.', 403);
    const body = await readJson(request);
    const reason = asString(body?.reason, 1000)?.trim();
    if (!reason) return jsonError('سبب الاعتذار مطلوب.', 400);
    const sr = await getServiceRequestById(id);
    if (!sr) return jsonError('غير موجود.', 404);
    if (sr.status !== 'pending') return jsonError('الطلب غير متاح.', 400);
    await declineServiceRequest(id, specRows[0].id, reason);
    return jsonOk({ ...sr, declinedByMe: true });
  } catch (error) {
    return mapError(error, 'service-requests:decline');
  }
}
