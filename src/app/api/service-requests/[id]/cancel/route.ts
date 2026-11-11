import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';

import { getDb } from '@/db';
import { organizations } from '@/db/schema';
import { jsonError, jsonOk, mapError } from '@/lib/api/http';
import { requireUser } from '@/lib/auth/session';
import { cancelServiceRequest, getServiceRequestById } from '@/repositories/serviceRequests';

/** POST /api/service-requests/[id]/cancel — the publishing organization withdraws a pending request. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const orgRows = await getDb().select().from(organizations).where(eq(organizations.userId, user.id)).limit(1);
    const sr = await getServiceRequestById(id);
    if (!sr) return jsonError('غير موجود.', 404);
    if (!orgRows[0] || orgRows[0].id !== sr.organizationId) return jsonError('غير مصرح.', 403);
    if (sr.status !== 'pending') return jsonError('لا يمكن إلغاء طلب بدأ العمل عليه.', 400);
    const cancelled = await cancelServiceRequest(id, orgRows[0].id);
    if (!cancelled) return jsonError('تعذر إلغاء الطلب.', 409);
    return jsonOk({ ...sr, ...cancelled });
  } catch (error) {
    return mapError(error, 'service-requests:cancel');
  }
}
