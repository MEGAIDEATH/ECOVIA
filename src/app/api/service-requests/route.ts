import type { NextRequest } from 'next/server';

import { jsonError, jsonOk, mapError, readJson, asString } from '@/lib/api/http';
import { requireUser } from '@/lib/auth/session';
import { getDb } from '@/db';
import { organizations, specialists } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  createServiceRequest,
  listServiceRequestsForOrganization,
  listAvailableServiceRequestsForSpecialist,
} from '@/repositories/serviceRequests';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireUser(request);
    const db = getDb();
    const org = await db.select().from(organizations).where(eq(organizations.userId, user.id)).limit(1);
    if (org[0]) {
      const list = await listServiceRequestsForOrganization(org[0].id);
      return jsonOk(list);
    }
    const spec = await db.select().from(specialists).where(eq(specialists.userId, user.id)).limit(1);
    if (spec[0] && spec[0].status === 'approved') {
      const list = await listAvailableServiceRequestsForSpecialist();
      return jsonOk(list);
    }
    return jsonError('غير مصرح.', 403);
  } catch (error) {
    return mapError(error, 'service-requests:get');
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await requireUser(request);
    const db = getDb();
    const orgRows = await db.select().from(organizations).where(eq(organizations.userId, user.id)).limit(1);
    if (!orgRows[0] || orgRows[0].status !== 'approved') {
      return jsonError('غير مصرح.', 403);
    }
    const body = await readJson(request);
    const serviceCategory = asString(body?.serviceCategory);
    const serviceName = asString(body?.serviceName);
    const region = asString(body?.region);
    const city = asString(body?.city);
    const duration = asString(body?.duration);
    const description = typeof body?.description === 'string' ? body.description : null;
    if (!serviceCategory || !serviceName || !region || !city || !duration) {
      return jsonError('الحقول المطلوبة غير مكتملة.', 400);
    }
    const created = await createServiceRequest({
      organizationId: orgRows[0].id,
      serviceCategory,
      serviceName,
      region,
      city,
      duration,
      description,
    });
    return jsonOk(created, 201);
  } catch (error) {
    return mapError(error, 'service-requests:post');
  }
}
