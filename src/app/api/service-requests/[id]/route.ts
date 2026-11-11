import type { NextRequest } from 'next/server';

import { jsonError, jsonOk, mapError } from '@/lib/api/http';
import { requireUser } from '@/lib/auth/session';
import { getDb } from '@/db';
import { organizations, specialists } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getServiceRequestById, hasSpecialistDeclined } from '@/repositories/serviceRequests';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const sr = await getServiceRequestById(id);
    if (!sr) return jsonError('غير موجود.', 404);
    const db = getDb();
    const org = await db.select().from(organizations).where(eq(organizations.userId, user.id)).limit(1);
    const spec = await db.select().from(specialists).where(eq(specialists.userId, user.id)).limit(1);
    const isOwnerOrg = org[0] && org[0].id === sr.organizationId;
    const isAssignedSpec = spec[0] && spec[0].id === sr.specialistId;
    const isEligibleSpec = spec[0] && spec[0].status === 'approved' && sr.status === 'pending';
    if (!isOwnerOrg && !isAssignedSpec && !isEligibleSpec) {
      return jsonError('غير مصرح.', 403);
    }
    // Viewer-specific flag: has this specialist personally declined it?
    if (spec[0] && !isOwnerOrg && sr.status === 'pending' && (await hasSpecialistDeclined(sr.id, spec[0].id))) {
      return jsonOk({ ...sr, declinedByMe: true });
    }
    return jsonOk(sr);
  } catch (error) {
    return mapError(error, 'service-requests:get-one');
  }
}
