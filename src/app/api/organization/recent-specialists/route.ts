import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';

import { getDb } from '@/db';
import { organizations } from '@/db/schema';
import { jsonError, jsonOk, mapError } from '@/lib/api/http';
import { requireUser } from '@/lib/auth/session';
import { listRecentSpecialistsForOrganization } from '@/repositories/serviceRequests';

/**
 * GET /api/organization/recent-specialists — specialists who took one of the
 * caller's service requests, deduplicated, most recent interaction first.
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireUser(request);
    const orgRows = await getDb().select().from(organizations).where(eq(organizations.userId, user.id)).limit(1);
    if (!orgRows[0] || orgRows[0].status !== 'approved') return jsonError('غير مصرح.', 403);
    return jsonOk(await listRecentSpecialistsForOrganization(orgRows[0].id));
  } catch (error) {
    return mapError(error, 'organization:recent-specialists');
  }
}
