import type { NextRequest } from 'next/server';

import { jsonError, jsonOk, mapError, readJson, asString } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/session';
import { getDb } from '@/db';
import { organizations, specialists } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    await requireAdmin(request);
    const body = await readJson(request);
    const collection = body?.collection;
    const id = asString(body?.id);
    const reason = asString(body?.reason);
    if ((collection !== 'specialists' && collection !== 'organizations') || !id || !reason) {
      return jsonError('بيانات غير صالحة.', 400);
    }
    const db = getDb();
    if (collection === 'specialists') {
      await db.update(specialists).set({ status: 'rejected', rejectionReason: reason, updatedAt: new Date() }).where(eq(specialists.id, id));
    } else {
      await db.update(organizations).set({ status: 'rejected', rejectionReason: reason, updatedAt: new Date() }).where(eq(organizations.id, id));
    }
    return jsonOk({ ok: true });
  } catch (error) {
    return mapError(error, 'admin:reject');
  }
}
