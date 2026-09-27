import type { NextRequest } from 'next/server';

import { jsonError, jsonOk, mapError, readJson } from '@/lib/api/http';
import { requireUser } from '@/lib/auth/session';
import { createApplication, listApplicationsForSpecialist } from '@/repositories/applications';

/**
 * GET /api/applications — lists application history for the current specialist
 * POST /api/applications — submits a new application to an organization
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireUser(request);
    const list = await listApplicationsForSpecialist(user.id);
    return jsonOk(list);
  } catch (error) {
    return mapError(error, 'applications:get');
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await requireUser(request);
    const body = await readJson(request);
    if (!body || typeof body.organizationId !== 'string') {
      return jsonError('معرّف المنشأة مطلوب.', 400);
    }

    const application = await createApplication({
      specialistUserId: user.id,
      organizationId: body.organizationId,
    });

    return jsonOk(application);
  } catch (error) {
    return mapError(error, 'applications:post');
  }
}
