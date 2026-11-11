import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';

import { getDb } from '@/db';
import { specialists } from '@/db/schema';
import { asString, jsonError, jsonOk, mapError, readJson } from '@/lib/api/http';
import { requireUser } from '@/lib/auth/session';
import { getServiceRequestById, transitionServiceRequest } from '@/repositories/serviceRequests';
import type { ServiceRequestStatus } from '@/types';

/** Lifecycle steps the assigned specialist may take. */
const ALLOWED: Partial<Record<ServiceRequestStatus, ServiceRequestStatus>> = {
  accepted: 'in_progress',
  in_progress: 'completed',
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
    const specRows = await getDb().select().from(specialists).where(eq(specialists.userId, user.id)).limit(1);
    if (!specRows[0] || specRows[0].id !== sr.specialistId) return jsonError('غير مصرح.', 403);
    if (ALLOWED[sr.status] !== nextStatus) return jsonError('انتقال غير مسموح.', 400);
    const updated = await transitionServiceRequest(id, sr.status, nextStatus as ServiceRequestStatus);
    if (!updated) return jsonError('تغيرت حالة الطلب، حدّث الصفحة.', 409);
    return jsonOk({ ...sr, ...updated, specialistName: sr.specialistName, organizationName: sr.organizationName });
  } catch (error) {
    return mapError(error, 'service-requests:status');
  }
}
