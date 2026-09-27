import { type NextRequest, NextResponse } from 'next/server';

import { jsonError, mapError } from '@/lib/api/http';
import { getSessionUserFromRequest } from '@/lib/auth/session';
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
 * GET /api/directory?kind=specialists|organizations[&id=...]
 *
 * Server-authorized directory lookup:
 * - Approved organizations can view approved specialists and full specialist CV details
 * - Approved specialists can view approved organizations
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await getSessionUserFromRequest(request);
    if (!user) return jsonError('غير مصرح بالوصول.', 401);

    const kind = request.nextUrl.searchParams.get('kind');
    const targetId = request.nextUrl.searchParams.get('id');

    if (kind !== 'specialists' && kind !== 'organizations') {
      return jsonError('طلب غير صالح.', 400);
    }

    if (kind === 'specialists') {
      // Caller must be an approved organization OR an admin
      const isCallerOrg = await getOrganizationByUserId(user.id);
      if (user.role !== 'admin' && (!isCallerOrg || isCallerOrg.status !== 'approved')) {
        return jsonError('غير مصرح بالوصول.', 403);
      }

      if (targetId) {
        // Can lookup by profile ID or user ID
        let specialist = await getSpecialistById(targetId);
        if (!specialist) specialist = await getSpecialistByUserId(targetId);

        if (!specialist || specialist.status !== 'approved') {
          return jsonError('غير موجود.', 404);
        }

        const publicDetails: PublicSpecialist = {
          ...specialist,
          nationalId: maskNationalIdForOrganization(specialist.nationalId),
        };
        return NextResponse.json(publicDetails);
      }

      const list = await listApprovedSpecialists();
      return NextResponse.json(list);
    }

    // kind === 'organizations'
    // Caller must be an approved specialist OR an admin
    const isCallerSpec = await getSpecialistByUserId(user.id);
    if (user.role !== 'admin' && (!isCallerSpec || isCallerSpec.status !== 'approved')) {
      return jsonError('غير مصرح بالوصول.', 403);
    }

    if (targetId) {
      let organization = await getOrganizationById(targetId);
      if (!organization) organization = await getOrganizationByUserId(targetId);

      if (!organization || organization.status !== 'approved') {
        return jsonError('غير موجود.', 404);
      }

      const entry: OrganizationDirectoryEntry = {
        id: organization.id,
        orgName: organization.orgName,
      };
      return NextResponse.json(entry);
    }

    const list = await listApprovedOrganizations();
    return NextResponse.json(list);
  } catch (error) {
    return mapError(error, 'directory');
  }
}
