import type { NextRequest } from 'next/server';

import { jsonError, jsonOk, mapError, readJson, asString } from '@/lib/api/http';
import { requireUser } from '@/lib/auth/session';
import { getDb } from '@/db';
import { specialists } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getServiceRequestById, rejectServiceRequest } from '@/repositories/serviceRequests';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const db = getDb();
    const specRows = await db.select().from(specialists).where(eq(specialists.userId, user.id)).limit(1);
    if (!specRows[0] || specRows[0].status !== 'approved') return jsonError('غير مصرح.', 403);
    const body = await readJson(request);
    const reason = asString(body?.reason);
    if (!reason) return jsonError('سبب الرفض مطلوب.', 400);
    const sr = await getServiceRequestById(id);
    if (!sr) return jsonError('غير موجود.', 404);
    if (sr.status !== 'pending') return jsonError('الطلب غير متاح.', 400);
    const rejected = await rejectServiceRequest(id, reason);
    if (!rejected) return jsonError('تعذر رفض الطلب.', 409);
    return jsonOk(rejected);
  } catch (error) {
    return mapError(error, 'service-requests:reject');
  }
}
