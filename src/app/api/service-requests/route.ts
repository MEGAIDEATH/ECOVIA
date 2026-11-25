import type { NextRequest } from 'next/server';

import { jsonError, jsonOk, mapError, readJson } from '@/lib/api/http';
import { getAccountFromRequest, requireApprovedUser } from '@/lib/auth/policies';
import { UnauthorizedError } from '@/lib/auth/session';
import { regionByCode } from '@/lib/regions';
import { parsePage, parseRequestCategory, parseSpecialistTab } from '@/lib/serviceRequests';
import { parseServiceRequestInput } from '@/lib/validation/marketplace';
import {
  createServiceRequest,
  getPrivateRequestTarget,
  listRequestsForOrganization,
  listRequestsForSpecialist,
} from '@/repositories/serviceRequests';

/**
 * GET /api/service-requests — the caller's scope, decided by the server:
 *   ?as=org  (default when the account owns an organization) → own requests, `?tab=open|contracted|previous`
 *   ?as=spec → requests visible to this specialist, `?tab=open|offers|contracted|declined&region=<code>`
 * POST /api/service-requests — an APPROVED facility publishes a request
 *   { serviceTypes: string[], activityDescription, notes?, region: <code>, city?, targetSpecialistId? }
 *   There is no price or duration on a request (the duration belongs to offers).
 * 401 without a session, 403 for unapproved or role-less accounts.
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const account = await getAccountFromRequest(request);
    if (!account) throw new UnauthorizedError();
    const params = request.nextUrl.searchParams;
    const as = params.get('as') === 'spec' || (!account.organization && account.specialist) ? 'spec' : 'org';
    const page = parsePage(params.get('page'));

    if (as === 'org') {
      const { profile } = await requireApprovedUser('org', request);
      return jsonOk(await listRequestsForOrganization(profile.id, parseRequestCategory(params.get('tab')), page));
    }
    const { profile } = await requireApprovedUser('spec', request);
    const region = regionByCode(params.get('region'));
    return jsonOk(
      await listRequestsForSpecialist(
        { id: profile.id, userId: account.user.id },
        parseSpecialistTab(params.get('tab')),
        { regionName: region?.nameAr ?? null, page },
      ),
    );
  } catch (error) {
    return mapError(error, 'service-requests:get');
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const { account, profile } = await requireApprovedUser('org', request);
    const body = await readJson(request);
    if (!body) return jsonError('طلب غير صالح.', 400);

    const parsed = parseServiceRequestInput(body);
    if (!parsed.ok) return Response.json({ error: parsed.error, fieldErrors: parsed.fieldErrors }, { status: 400 });

    let target = null;
    if (parsed.data.targetSpecialistId) {
      target = await getPrivateRequestTarget(parsed.data.targetSpecialistId, account.user.id);
      if (!target) return jsonError('الأخصائي المحدد غير متاح لاستقبال طلب خاص.', 400);
    }
    const { request: created } = await createServiceRequest(
      { organizationId: profile.id, organizationUserId: account.user.id, organizationName: profile.orgName, target },
      parsed.data,
    );
    return jsonOk(created, 201);
  } catch (error) {
    return mapError(error, 'service-requests:post');
  }
}
