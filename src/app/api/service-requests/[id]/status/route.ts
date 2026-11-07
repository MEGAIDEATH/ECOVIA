import type { NextRequest } from 'next/server';

import { jsonError, jsonOk, mapError, readJson, asString } from '@/lib/api/http';
import { requireUser } from '@/lib/auth/session';
import { getDb } from '@/db';
import { specialists } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getServiceRequestById, updateServiceRequestStatus } from '@/repositories/serviceRequests';

const ALLOWED: Record<string, string[]> = {
  accepted: ['in_progress'],
  in_progress: ['completed'],
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const body = await readJson(request);
    const nextStatus = asString(body?.status);
    if (!nextStatus) return jsonError('الحالة مطلوبة.', 400);
    const sr = await getServiceRequestById(id);
    if (!sr) return jsonError('غير موجود.', 404);
    const db = getDb();
    const specRows = await db.select().from(specialists).where(eq(specialists.userId, user.id)).limit(1);
    const isAssignedSpec = specRows[0] && specRows[0].id === sr.specialistId;
    if (!isAssignedSpec) return jsonError('غير مصرح.', 403);
    if (!ALLOWED[sr.status]?.includes(nextStatus)) return jsonError('انتقال غير مسموح.', 400);
    const updated = await updateServiceRequestStatus(id, nextStatus as 'in_progress' | 'completed');
    if (!updated) return jsonError('تعذر التحديث.', 409);
    return jsonOk(updated);
  } catch (error) {
    return mapError(error, 'service-requests:status');
  }
}
