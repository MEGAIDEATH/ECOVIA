import { type NextRequest, NextResponse } from 'next/server';

import { jsonError, mapError } from '@/lib/api/http';
import { requireAuthenticatedUser } from '@/lib/auth/policies';
import { approvedIds } from '@/lib/auth/recordAccess';
import { ForbiddenError } from '@/lib/auth/session';
import { isUuid } from '@/lib/utils/ids';
import { maskNationalIdForOrganization } from '@/lib/utils/cv';
import {
  getOrganizationById,
  getOrganizationByUserId,
  getSpecialistById,
  getSpecialistByUserId,
  listApprovedOrganizations,
  listApprovedSpecialists,
} from '@/repositories/profiles';
import type { OrganizationDirectoryEntry, PublicSpecialist } from '@/types';

/**
 * GET /api/directory?kind=specialists|organizations[&id=<profile id | user id>]
 * - approved organizations (or admins) → approved specialists and their CV;
 * - approved specialists (or admins) → approved organizations (name only).
 * Pending / rejected accounts → 403.
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const account = await requireAuthenticatedUser(request);
    const ids = approvedIds(account);
    const kind = request.nextUrl.searchParams.get('kind');
    const targetId = request.nextUrl.searchParams.get('id');

    if (kind !== 'specialists' && kind !== 'organizations') return jsonError('طلب غير صالح.', 400);
    if (targetId && targetId.length > 64) return jsonError('طلب غير صالح.', 400);

    if (kind === 'specialists') {
      if (!account.isAdmin && !ids.approvedOrganizationId) throw new ForbiddenError();
      if (targetId) {
        const specialist = isUuid(targetId) ? await getSpecialistById(targetId) : await getSpecialistByUserId(targetId);
        if (!specialist || specialist.status !== 'approved') return jsonError('غير موجود.', 404);
        const publicDetails: PublicSpecialist = {
          ...specialist,
          nationalId: maskNationalIdForOrganization(specialist.nationalId),
        };
        return NextResponse.json(publicDetails);
      }
      return NextResponse.json(await listApprovedSpecialists());
    }

    if (!account.isAdmin && !ids.approvedSpecialistId) throw new ForbiddenError();
    if (targetId) {
      const organization = isUuid(targetId) ? await getOrganizationById(targetId) : await getOrganizationByUserId(targetId);
      if (!organization || organization.status !== 'approved') return jsonError('غير موجود.', 404);
      const entry: OrganizationDirectoryEntry = { id: organization.id, orgName: organization.orgName };
      return NextResponse.json(entry);
    }
    return NextResponse.json(await listApprovedOrganizations());
  } catch (error) {
    return mapError(error, 'directory');
  }
}
