import 'server-only';

import { isApprovedStatus } from '@/lib/auth/access';
import { specialistCanView } from '@/lib/marketplace/rules';
import { getContractDocument, type ContractDocument } from '@/repositories/contracts';
import { canViewDocument, getDocumentById, type DocumentRow } from '@/repositories/documents';
import { getOwnOffer } from '@/repositories/marketplace';
import { getRequestWithFacts, hasSpecialistDeclined } from '@/repositories/serviceRequests';
import type { Offer, ServiceRequest, UserRole } from '@/types';

import type { CurrentAccount } from './policies';
import { ForbiddenError, NotFoundError } from './session';

/**
 * Record-level authorization ("may THIS user touch THIS row?"). Ids come from
 * the URL or a form, so every check re-reads the record and compares it with
 * the session's own profiles. Records outside the caller's scope are reported
 * as missing (404) so ids cannot be probed; an account without any approved
 * profile gets 403.
 */

export function approvedIds(account: CurrentAccount) {
  return {
    approvedSpecialistId: isApprovedStatus(account.specialist?.status) ? account.specialist!.id : null,
    approvedOrganizationId: isApprovedStatus(account.organization?.status) ? account.organization!.id : null,
  };
}

export type RequestView =
  | { as: 'org'; request: ServiceRequest }
  | { as: 'spec'; request: ServiceRequest; ownOffer: Offer | null; declined: boolean };

/**
 * A service request as the caller may see it. `perspective` forces one side
 * for users who own both a facility and a specialist profile.
 */
export async function loadRequestForViewer(
  account: CurrentAccount,
  id: string,
  perspective?: UserRole,
): Promise<RequestView | null | 'forbidden'> {
  const { approvedSpecialistId, approvedOrganizationId } = approvedIds(account);
  if (!approvedSpecialistId && !approvedOrganizationId) return 'forbidden';

  const found = await getRequestWithFacts(id);
  if (!found) return null;
  const { request, facts } = found;

  if (perspective !== 'spec' && approvedOrganizationId && facts.organizationId === approvedOrganizationId) {
    return { as: 'org', request };
  }
  if (perspective !== 'org' && approvedSpecialistId) {
    const ownOffer = await getOwnOffer(request.id, approvedSpecialistId);
    const specialist = { id: approvedSpecialistId, userId: account.user.id, approved: true };
    if (!specialistCanView(facts, specialist, Boolean(ownOffer))) return null;
    const declined = await hasSpecialistDeclined(request.id, approvedSpecialistId);
    return {
      as: 'spec',
      // Competitors' offer counts are facility-only information.
      request: { ...request, offerCount: undefined, myOfferStatus: ownOffer?.status ?? null, declinedByMe: declined },
      ownOffer,
      declined,
    };
  }
  return null;
}

export type RecordRef =
  | { kind: 'serviceRequest'; id: string; perspective?: UserRole }
  | { kind: 'contract'; id: string }
  | { kind: 'document'; id: string };

export type RecordAccessResult<R extends RecordRef> = R['kind'] extends 'serviceRequest'
  ? RequestView
  : R['kind'] extends 'contract'
    ? ContractDocument
    : DocumentRow;

/**
 * Throws NotFoundError (404) / ForbiddenError (403) unless the caller may
 * access the record; returns the record as the caller is allowed to see it.
 */
export async function requireRecordAccess<R extends RecordRef>(
  account: CurrentAccount,
  ref: R,
): Promise<RecordAccessResult<R>> {
  const ids = approvedIds(account);
  if (ref.kind === 'serviceRequest') {
    const view = await loadRequestForViewer(account, ref.id, ref.perspective);
    if (view === 'forbidden') throw new ForbiddenError();
    if (!view) throw new NotFoundError();
    return view as RecordAccessResult<R>;
  }
  if (ref.kind === 'contract') {
    if (!ids.approvedOrganizationId && !ids.approvedSpecialistId && !account.isAdmin) throw new ForbiddenError();
    const contract = await getContractDocument(ref.id, {
      isAdmin: account.isAdmin,
      organizationId: ids.approvedOrganizationId,
      specialistId: ids.approvedSpecialistId,
    });
    if (!contract) throw new NotFoundError('العقد غير موجود.');
    return contract as RecordAccessResult<R>;
  }
  const doc = await getDocumentById(ref.id);
  if (!doc) throw new NotFoundError('الملف غير موجود.');
  const allowed = await canViewDocument(
    { userId: account.user.id, isAdmin: account.isAdmin, ...ids },
    doc,
  );
  if (!allowed) throw new ForbiddenError('غير مصرح بالوصول إلى هذا الملف.');
  return doc as RecordAccessResult<R>;
}
