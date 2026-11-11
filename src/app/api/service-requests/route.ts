import type { NextRequest } from 'next/server';

import { jsonError, jsonOk, mapError, readJson, asString } from '@/lib/api/http';
import { requireUser } from '@/lib/auth/session';
import { getDb } from '@/db';
import { organizations, specialists } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { formatDuration, isSaudiRegion, parseCost, parseDuration } from '@/lib/serviceRequests';
import {
  createServiceRequest,
  listServiceRequestsForOrganization,
  listServiceRequestsForSpecialist,
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
      const list = await listServiceRequestsForSpecialist(spec[0].id);
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
    const serviceName = asString(body?.serviceName, 200)?.trim();
    const cost = parseCost(body?.cost);
    const duration = parseDuration(body?.durationValue, body?.durationUnit);
    const region = asString(body?.region, 100)?.trim();
    if (!serviceName) return jsonError('اسم الخدمة مطلوب.', 400);
    if (cost === null) return jsonError('تكلفة الخدمة يجب أن تكون مبلغًا صحيحًا غير سالب.', 400);
    if (!duration) return jsonError('المدة المطلوبة غير صالحة.', 400);
    if (!isSaudiRegion(region)) return jsonError('اختر منطقة صحيحة من القائمة.', 400);
    const optional = (value: unknown, max: number) => asString(value, max)?.trim() || null;
    const created = await createServiceRequest({
      organizationId: orgRows[0].id,
      serviceName,
      cost,
      durationValue: duration.value,
      durationUnit: duration.unit,
      durationLabel: formatDuration(duration.value, duration.unit),
      region,
      city: optional(body?.city, 100),
      serviceCategory: optional(body?.serviceCategory, 200),
      description: optional(body?.description, 5000),
    });
    return jsonOk(created, 201);
  } catch (error) {
    return mapError(error, 'service-requests:post');
  }
}
