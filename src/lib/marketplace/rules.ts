/**
 * Marketplace business rules as pure functions (no I/O). Repositories enforce
 * the same rules in SQL for lists and inside transactions for mutations; the
 * detail pages and Server Actions call these on freshly loaded rows.
 *
 * Request / offer / contract state machine (documented in
 * docs/ECHOVIA_IMPLEMENTATION_REPORT.md §7):
 *
 *   request.pending  "open for offers"  ── offers: submitted ⇄ selected
 *        │                                contract: pending (≤ 1 at a time)
 *        │  specialist signs the pending contract (atomic, ≤ 1 signed ever)
 *        ▼
 *   request.accepted "contracted" → in_progress → completed
 *   request.pending → cancelled (facility withdraws an open request)
 */
import type { OfferStatus, RequestVisibility, ServiceRequestStatus } from '@/types';

export interface RequestFacts {
  organizationId: string;
  /** Owner user id of the publishing organization (self-dealing guard). */
  organizationUserId: string;
  visibility: RequestVisibility;
  targetSpecialistId: string | null;
  status: ServiceRequestStatus;
  /** Contracted specialist, once a contract is signed. */
  specialistId: string | null;
}

export interface SpecialistFacts {
  id: string;
  userId: string;
  approved: boolean;
}

/** Open for offers: no signed contract yet and not cancelled/closed. */
export function isOpenForOffers(request: Pick<RequestFacts, 'status'>): boolean {
  return request.status === 'pending';
}

/** Offer statuses that still compete for the request. */
export const ACTIVE_OFFER_STATUSES: readonly OfferStatus[] = ['submitted', 'selected'];

export function isActiveOffer(status: OfferStatus | null | undefined): boolean {
  return status === 'submitted' || status === 'selected';
}

/**
 * May this specialist see the request?
 * - private requests: only the designated specialist, ever;
 * - public requests: while open, or afterwards when the specialist took part
 *   (has an offer) or holds the contract.
 */
export function specialistCanView(
  request: RequestFacts,
  specialist: SpecialistFacts,
  hasOffer: boolean,
): boolean {
  if (!specialist.approved) return false;
  if (request.visibility === 'private') return request.targetSpecialistId === specialist.id;
  if (request.specialistId === specialist.id || hasOffer) return true;
  return isOpenForOffers(request);
}

export type OfferBlockReason = 'not_visible' | 'own_request' | 'closed' | 'contract_pending' | 'finalized';

export const OFFER_BLOCK_MESSAGES: Record<OfferBlockReason, string> = {
  not_visible: 'الطلب غير متاح لك.',
  own_request: 'لا يمكنك تقديم عرض على طلب منشأتك.',
  closed: 'الطلب مغلق ولا يستقبل عروضاً جديدة.',
  contract_pending: 'اختارت المنشأة عرضك وأعدّت العقد؛ لا يمكن تعديل العرض أثناء انتظار التوقيع.',
  finalized: 'لا يمكن تعديل هذا العرض.',
};

/** Why this specialist may NOT submit or revise an offer now (null = allowed). */
export function offerBlockReason(
  request: RequestFacts,
  specialist: SpecialistFacts,
  existingOfferStatus: OfferStatus | null,
): OfferBlockReason | null {
  if (!specialistCanView(request, specialist, existingOfferStatus !== null)) return 'not_visible';
  if (request.organizationUserId === specialist.userId) return 'own_request';
  if (!isOpenForOffers(request)) return 'closed';
  if (existingOfferStatus === 'selected') return 'contract_pending';
  if (existingOfferStatus === 'accepted') return 'finalized';
  return null;
}

/** Lifecycle steps the contracted specialist may take after signing. */
export const SPECIALIST_PROGRESS: Partial<Record<ServiceRequestStatus, ServiceRequestStatus>> = {
  accepted: 'in_progress',
  in_progress: 'completed',
};

export function canCancelRequest(request: Pick<RequestFacts, 'status'>): boolean {
  return request.status === 'pending';
}
