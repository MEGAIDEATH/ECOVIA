import 'server-only';

import { and, asc, desc, eq, inArray, ne } from 'drizzle-orm';

import { getDb, type Database } from '@/db';
import {
  accountEvents,
  contracts,
  conversations,
  messages,
  organizations,
  serviceRequestOffers,
  serviceRequests,
  specialists,
} from '@/db/schema';
import { DomainError } from '@/lib/marketplace/errors';
import {
  OFFER_BLOCK_MESSAGES,
  isActiveOffer,
  isOpenForOffers,
  offerBlockReason,
  type SpecialistFacts,
} from '@/lib/marketplace/rules';
import { formatDuration } from '@/lib/serviceRequests';
import { requestTitle } from '@/lib/serviceTypes';
import { isUuid } from '@/lib/utils/ids';
import type { ContractInput, OfferInput } from '@/lib/validation/marketplace';
import type { ContractSummary, Offer, OfferStatus } from '@/types';

import { notify } from './notifications';
import { requestFacts } from './serviceRequests';

/**
 * Offer → contract lifecycle. Every mutation runs in ONE transaction that
 * locks the service request row first (`SELECT … FOR UPDATE`) and the offer /
 * contract rows second, always in that order, so concurrent actions on the
 * same request serialize instead of deadlocking or racing. The partial unique
 * indexes on `contracts` are the last line of defence: even a logic bug cannot
 * produce two signed (or two pending) contracts for one request.
 */
type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

const UNIQUE_VIOLATION = '23505';

function pgErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; current && depth < 4; depth += 1) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === 'string') return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

function constraintName(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; current && depth < 4; depth += 1) {
    const name = (current as { constraint?: unknown }).constraint;
    if (typeof name === 'string') return name;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

type OfferRow = typeof serviceRequestOffers.$inferSelect;
type ContractRow = typeof contracts.$inferSelect;

function toContractSummary(row: ContractRow): ContractSummary {
  return {
    id: row.id,
    serviceRequestId: row.serviceRequestId,
    offerId: row.offerId,
    status: row.status,
    title: row.title,
    value: row.value,
    duration: row.duration,
    specialistId: row.specialistId,
    organizationId: row.organizationId,
    createdAt: row.createdAt.toISOString(),
    signedAt: row.signedAt?.toISOString() ?? null,
  };
}

/** Locks the request row and returns it with the publishing facility's facts. */
async function lockRequest(tx: Tx, requestId: string) {
  if (!isUuid(requestId)) throw new DomainError('الطلب غير موجود.', 404);
  const rows = await tx
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.id, requestId))
    .for('update')
    .limit(1);
  const request = rows[0];
  if (!request) throw new DomainError('الطلب غير موجود.', 404);
  const [org] = await tx
    .select({ id: organizations.id, userId: organizations.userId, name: organizations.orgName })
    .from(organizations)
    .where(eq(organizations.id, request.organizationId))
    .limit(1);
  if (!org) throw new DomainError('الطلب غير موجود.', 404);
  return { request, org, facts: requestFacts(request, org.userId) };
}

async function audit(tx: Tx, actorUserId: string, action: string, targetId: string, detail?: string) {
  await tx.insert(accountEvents).values({ actorUserId, action, targetId, detail: detail ?? null });
}

/* -------------------------------------------------------------------------
 * Offers (specialist side)
 * ---------------------------------------------------------------------- */

export interface ActingSpecialist extends SpecialistFacts {
  fullName: string;
}

/**
 * Submits a new offer or revises the specialist's existing one. Only an
 * approved, eligible specialist; never on closed requests; a private request
 * only accepts its designated specialist; a declined offer cannot be revived.
 */
export async function submitOffer(
  requestId: string,
  specialist: ActingSpecialist,
  input: OfferInput,
): Promise<{ offerId: string; created: boolean }> {
  return getDb().transaction(async (tx) => {
    const { request, org, facts } = await lockRequest(tx, requestId);
    const existing = (
      await tx
        .select()
        .from(serviceRequestOffers)
        .where(
          and(
            eq(serviceRequestOffers.serviceRequestId, request.id),
            eq(serviceRequestOffers.specialistId, specialist.id),
          ),
        )
        .for('update')
        .limit(1)
    )[0];

    const blocked = offerBlockReason(facts, specialist, existing?.status ?? null);
    if (blocked === 'not_visible') throw new DomainError(OFFER_BLOCK_MESSAGES.not_visible, 404);
    if (blocked) throw new DomainError(OFFER_BLOCK_MESSAGES[blocked]);
    if (existing?.status === 'declined') throw new DomainError('اعتذرت المنشأة عن هذا العرض.');

    const now = new Date();
    const values = {
      durationValue: input.durationValue,
      durationUnit: input.durationUnit,
      message: input.message,
      status: 'submitted' as const,
      updatedAt: now,
    };
    let offerId: string;
    const created = !existing;
    if (existing) {
      await tx.update(serviceRequestOffers).set(values).where(eq(serviceRequestOffers.id, existing.id));
      offerId = existing.id;
    } else {
      const [inserted] = await tx
        .insert(serviceRequestOffers)
        .values({ ...values, serviceRequestId: request.id, specialistId: specialist.id })
        .returning({ id: serviceRequestOffers.id });
      offerId = inserted.id;
    }

    const duration = formatDuration(input.durationValue, input.durationUnit);
    await notify(tx, {
      recipientUserId: org.userId,
      type: created ? 'offer.received' : 'offer.updated',
      title: created ? `عرض جديد من ${specialist.fullName}` : `عدّل ${specialist.fullName} عرضه`,
      message: `${requestTitle(request)} — مدة التنفيذ: ${duration}`,
      relatedId: request.id,
      dedupeKey: created ? `offer.received:${offerId}` : `offer.updated:${offerId}:${now.getTime()}`,
    });
    await audit(tx, specialist.userId, created ? 'offer.submitted' : 'offer.revised', offerId, duration);
    return { offerId, created };
  });
}

/** The specialist withdraws their offer; a contract awaiting their signature is cancelled with it. */
export async function withdrawOffer(requestId: string, specialist: ActingSpecialist): Promise<void> {
  await getDb().transaction(async (tx) => {
    const { request, org } = await lockRequest(tx, requestId);
    const offer = (
      await tx
        .select()
        .from(serviceRequestOffers)
        .where(
          and(
            eq(serviceRequestOffers.serviceRequestId, request.id),
            eq(serviceRequestOffers.specialistId, specialist.id),
          ),
        )
        .for('update')
        .limit(1)
    )[0];
    if (!offer) throw new DomainError('لا يوجد عرض لسحبه.', 404);
    if (!isActiveOffer(offer.status) || !isOpenForOffers(request)) throw new DomainError('لا يمكن سحب هذا العرض الآن.');

    const now = new Date();
    if (offer.status === 'selected') {
      await tx
        .update(contracts)
        .set({ status: 'cancelled', cancelledAt: now, updatedAt: now })
        .where(and(eq(contracts.offerId, offer.id), eq(contracts.status, 'pending')));
    }
    await tx
      .update(serviceRequestOffers)
      .set({ status: 'withdrawn', updatedAt: now })
      .where(eq(serviceRequestOffers.id, offer.id));
    await notify(tx, {
      recipientUserId: org.userId,
      type: 'offer.withdrawn',
      title: `سحب ${specialist.fullName} عرضه`,
      message: requestTitle(request),
      relatedId: request.id,
      dedupeKey: `offer.withdrawn:${offer.id}:${now.getTime()}`,
    });
    await audit(tx, specialist.userId, 'offer.withdrawn', offer.id);
  });
}

/* -------------------------------------------------------------------------
 * Offers & contracts (facility side)
 * ---------------------------------------------------------------------- */

export interface ActingOrganization {
  id: string;
  userId: string;
  name: string;
}

async function lockOwnedOffer(tx: Tx, offerId: string, organization: ActingOrganization) {
  if (!isUuid(offerId)) throw new DomainError('العرض غير موجود.', 404);
  const [peek] = await tx
    .select({ requestId: serviceRequestOffers.serviceRequestId })
    .from(serviceRequestOffers)
    .where(eq(serviceRequestOffers.id, offerId))
    .limit(1);
  if (!peek) throw new DomainError('العرض غير موجود.', 404);
  const locked = await lockRequest(tx, peek.requestId);
  if (locked.request.organizationId !== organization.id) throw new DomainError('العرض غير موجود.', 404);
  const [offer] = await tx
    .select()
    .from(serviceRequestOffers)
    .where(eq(serviceRequestOffers.id, offerId))
    .for('update')
    .limit(1);
  const [spec] = await tx
    .select({ id: specialists.id, userId: specialists.userId, fullName: specialists.fullName, status: specialists.status })
    .from(specialists)
    .where(eq(specialists.id, offer.specialistId))
    .limit(1);
  return { ...locked, offer, specialist: spec };
}

/** The facility declines an offer it does not want (the request stays open). */
export async function declineOffer(offerId: string, organization: ActingOrganization): Promise<void> {
  await getDb().transaction(async (tx) => {
    const { request, offer, specialist } = await lockOwnedOffer(tx, offerId, organization);
    if (offer.status !== 'submitted') {
      throw new DomainError(
        offer.status === 'selected' ? 'اسحب العقد المعدّ لهذا العرض أولاً.' : 'لا يمكن الاعتذار عن هذا العرض.',
      );
    }
    const now = new Date();
    await tx.update(serviceRequestOffers).set({ status: 'declined', updatedAt: now }).where(eq(serviceRequestOffers.id, offer.id));
    await notify(tx, {
      recipientUserId: specialist.userId,
      type: 'offer.declined',
      title: `اعتذرت ${organization.name} عن عرضك`,
      message: requestTitle(request),
      relatedId: request.id,
      dedupeKey: `offer.declined:${offer.id}`,
    });
    await audit(tx, organization.userId, 'offer.declined', offer.id);
  });
}

/**
 * Selecting an offer = preparing its contract. The request stays OPEN: other
 * specialists can still submit offers until this (or another) contract is
 * signed. At most one contract may await signature per request.
 */
export async function prepareContract(
  offerId: string,
  organization: ActingOrganization,
  input: ContractInput,
): Promise<{ contractId: string }> {
  try {
    return await getDb().transaction(async (tx) => {
      const { request, offer, specialist } = await lockOwnedOffer(tx, offerId, organization);
      if (!isOpenForOffers(request)) throw new DomainError('الطلب مغلق ولا يمكن إعداد عقد له.');
      if (offer.status !== 'submitted') throw new DomainError('يمكن إعداد العقد لعرض مقدَّم فقط.');
      if (specialist.status !== 'approved') throw new DomainError('حساب الأخصائي غير معتمد حالياً.');

      const [pending] = await tx
        .select({ id: contracts.id })
        .from(contracts)
        .where(and(eq(contracts.serviceRequestId, request.id), eq(contracts.status, 'pending')))
        .limit(1);
      if (pending) throw new DomainError('يوجد عقد آخر بانتظار التوقيع لهذا الطلب؛ اسحبه أولاً.');

      // The pair's conversation carries the contract card.
      await tx
        .insert(conversations)
        .values({ organizationId: organization.id, specialistId: specialist.id })
        .onConflictDoNothing({ target: [conversations.organizationId, conversations.specialistId] });
      const [conversation] = await tx
        .select({ id: conversations.id })
        .from(conversations)
        .where(and(eq(conversations.organizationId, organization.id), eq(conversations.specialistId, specialist.id)))
        .limit(1);

      const now = new Date();
      const [message] = await tx
        .insert(messages)
        .values({ conversationId: conversation.id, senderUserId: organization.userId, body: 'عقد جديد', isContract: true })
        .returning({ id: messages.id });

      const title = input.title ?? requestTitle(request);
      const [contract] = await tx
        .insert(contracts)
        .values({
          messageId: message.id,
          conversationId: conversation.id,
          serviceRequestId: request.id,
          offerId: offer.id,
          organizationId: organization.id,
          specialistId: specialist.id,
          title,
          value: input.value,
          duration: formatDuration(offer.durationValue, offer.durationUnit),
          organizationSignature: input.organizationSignature,
          organizationSignedAt: now,
          status: 'pending',
        })
        .returning({ id: contracts.id });

      await tx.update(serviceRequestOffers).set({ status: 'selected', updatedAt: now }).where(eq(serviceRequestOffers.id, offer.id));
      await tx
        .update(conversations)
        .set({ lastMessage: 'عقد جديد', lastMessageIsContract: true, lastMessageAt: now })
        .where(eq(conversations.id, conversation.id));
      await notify(tx, {
        recipientUserId: specialist.userId,
        type: 'contract.prepared',
        title: `أعدّت ${organization.name} عقداً لعرضك`,
        message: `${title} — راجع العقد ووقّعه لإتمام التعاقد.`,
        relatedId: request.id,
        dedupeKey: `contract.prepared:${contract.id}`,
      });
      await audit(tx, organization.userId, 'contract.prepared', contract.id, title);
      return { contractId: contract.id };
    });
  } catch (error) {
    if (pgErrorCode(error) === UNIQUE_VIOLATION && constraintName(error) === 'contracts_one_pending_per_request') {
      throw new DomainError('يوجد عقد آخر بانتظار التوقيع لهذا الطلب؛ اسحبه أولاً.');
    }
    throw error;
  }
}

/** The facility withdraws a contract that is still awaiting the specialist's signature. */
export async function withdrawContract(contractId: string, organization: ActingOrganization): Promise<void> {
  await getDb().transaction(async (tx) => {
    if (!isUuid(contractId)) throw new DomainError('العقد غير موجود.', 404);
    const [peek] = await tx
      .select({ requestId: contracts.serviceRequestId, organizationId: contracts.organizationId })
      .from(contracts)
      .where(eq(contracts.id, contractId))
      .limit(1);
    if (!peek || peek.organizationId !== organization.id) throw new DomainError('العقد غير موجود.', 404);
    const request = peek.requestId ? (await lockRequest(tx, peek.requestId)).request : null;
    const [contract] = await tx.select().from(contracts).where(eq(contracts.id, contractId)).for('update').limit(1);
    if (contract.status !== 'pending') throw new DomainError('لا يمكن سحب عقد موقّع أو ملغى.');

    const now = new Date();
    await tx
      .update(contracts)
      .set({ status: 'cancelled', cancelledAt: now, updatedAt: now })
      .where(and(eq(contracts.id, contract.id), eq(contracts.status, 'pending')));
    if (contract.offerId) {
      await tx
        .update(serviceRequestOffers)
        .set({ status: 'submitted', updatedAt: now })
        .where(and(eq(serviceRequestOffers.id, contract.offerId), eq(serviceRequestOffers.status, 'selected')));
    }
    const [spec] = await tx
      .select({ userId: specialists.userId })
      .from(specialists)
      .where(eq(specialists.id, contract.specialistId))
      .limit(1);
    if (spec) {
      await notify(tx, {
        recipientUserId: spec.userId,
        type: 'contract.withdrawn',
        title: `سحبت ${organization.name} العقد المعدّ`,
        message: request ? requestTitle(request) : contract.title,
        relatedId: request?.id ?? contract.id,
        dedupeKey: `contract.withdrawn:${contract.id}`,
      });
    }
    await audit(tx, organization.userId, 'contract.withdrawn', contract.id);
  });
}

/**
 * The specialist signs a pending contract. For a request-linked contract this
 * is the moment the request closes: in one transaction the contract becomes
 * `signed`, its offer `accepted`, every other active offer `declined`, any
 * other pending contract `cancelled`, and the request `accepted` (contracted)
 * with the specialist assigned. Concurrent attempts serialize on the request
 * row lock; `contracts_one_signed_per_request` rejects any second signature.
 */
export async function signContract(
  contractId: string,
  specialist: ActingSpecialist,
  signature: string,
): Promise<{ serviceRequestId: string | null }> {
  try {
    return await getDb().transaction(async (tx) => {
      if (!isUuid(contractId)) throw new DomainError('العقد غير موجود.', 404);
      const [peek] = await tx
        .select({ requestId: contracts.serviceRequestId, specialistId: contracts.specialistId })
        .from(contracts)
        .where(eq(contracts.id, contractId))
        .limit(1);
      if (!peek || peek.specialistId !== specialist.id) throw new DomainError('العقد غير موجود.', 404);

      const locked = peek.requestId ? await lockRequest(tx, peek.requestId) : null;
      const [contract] = await tx.select().from(contracts).where(eq(contracts.id, contractId)).for('update').limit(1);
      if (contract.status === 'signed') throw new DomainError('تم توقيع العقد مسبقاً.');
      if (contract.status !== 'pending') throw new DomainError('هذا العقد لم يعد متاحاً للتوقيع.');
      if (locked && !isOpenForOffers(locked.request)) throw new DomainError('الطلب مغلق؛ لا يمكن توقيع هذا العقد.');

      const now = new Date();
      const signed = await tx
        .update(contracts)
        .set({ status: 'signed', specialistSignature: signature, signedAt: now, updatedAt: now })
        .where(and(eq(contracts.id, contract.id), eq(contracts.status, 'pending')))
        .returning({ id: contracts.id });
      if (signed.length === 0) throw new DomainError('تم توقيع العقد مسبقاً.');

      let organizationUserId: string | null = locked?.org.userId ?? null;
      if (locked) {
        const { request } = locked;
        if (contract.offerId) {
          await tx
            .update(serviceRequestOffers)
            .set({ status: 'accepted', updatedAt: now })
            .where(eq(serviceRequestOffers.id, contract.offerId));
        }
        const losers = await tx
          .update(serviceRequestOffers)
          .set({ status: 'declined', updatedAt: now })
          .where(
            and(
              eq(serviceRequestOffers.serviceRequestId, request.id),
              inArray(serviceRequestOffers.status, ['submitted', 'selected']),
              contract.offerId ? ne(serviceRequestOffers.id, contract.offerId) : undefined,
            ),
          )
          .returning({ specialistId: serviceRequestOffers.specialistId });
        await tx
          .update(contracts)
          .set({ status: 'cancelled', cancelledAt: now, updatedAt: now })
          .where(
            and(eq(contracts.serviceRequestId, request.id), eq(contracts.status, 'pending'), ne(contracts.id, contract.id)),
          );
        const closed = await tx
          .update(serviceRequests)
          .set({ status: 'accepted', specialistId: specialist.id, conversationId: contract.conversationId, updatedAt: now })
          .where(and(eq(serviceRequests.id, request.id), eq(serviceRequests.status, 'pending')))
          .returning({ id: serviceRequests.id });
        if (closed.length === 0) throw new DomainError('الطلب مغلق؛ لا يمكن توقيع هذا العقد.');

        if (losers.length > 0) {
          const loserUsers = await tx
            .select({ userId: specialists.userId })
            .from(specialists)
            .where(inArray(specialists.id, losers.map((row) => row.specialistId)));
          await notify(
            tx,
            loserUsers.map(({ userId }) => ({
              recipientUserId: userId,
              type: 'request.awarded_elsewhere' as const,
              title: 'تم التعاقد على طلب قدّمت عليه',
              message: `${requestTitle(request)} — تم توقيع العقد مع أخصائي آخر.`,
              relatedId: request.id,
              dedupeKey: `request.awarded_elsewhere:${request.id}`,
            })),
          );
        }
      } else {
        const [org] = await tx
          .select({ userId: organizations.userId })
          .from(organizations)
          .where(eq(organizations.id, contract.organizationId))
          .limit(1);
        organizationUserId = org?.userId ?? null;
      }

      if (organizationUserId) {
        await notify(tx, {
          recipientUserId: organizationUserId,
          type: 'contract.signed',
          title: `وقّع ${specialist.fullName} العقد`,
          message: contract.title,
          relatedId: contract.id,
          dedupeKey: `contract.signed:${contract.id}`,
        });
      }
      await audit(tx, specialist.userId, 'contract.signed', contract.id, contract.title);
      return { serviceRequestId: locked?.request.id ?? null };
    });
  } catch (error) {
    if (pgErrorCode(error) === UNIQUE_VIOLATION && constraintName(error) === 'contracts_one_signed_per_request') {
      throw new DomainError('تم توقيع عقد آخر لهذا الطلب بالفعل.');
    }
    throw error;
  }
}

/** The facility cancels its open request: pending contracts are voided and offerers informed. */
export async function cancelRequest(requestId: string, organization: ActingOrganization): Promise<void> {
  await getDb().transaction(async (tx) => {
    const { request } = await lockRequest(tx, requestId);
    if (request.organizationId !== organization.id) throw new DomainError('الطلب غير موجود.', 404);
    if (!isOpenForOffers(request)) throw new DomainError('لا يمكن إلغاء طلب تم التعاقد عليه أو أُغلق.');
    const now = new Date();
    await tx
      .update(contracts)
      .set({ status: 'cancelled', cancelledAt: now, updatedAt: now })
      .where(and(eq(contracts.serviceRequestId, request.id), eq(contracts.status, 'pending')));
    const affected = await tx
      .update(serviceRequestOffers)
      .set({ status: 'declined', updatedAt: now })
      .where(
        and(
          eq(serviceRequestOffers.serviceRequestId, request.id),
          inArray(serviceRequestOffers.status, ['submitted', 'selected']),
        ),
      )
      .returning({ specialistId: serviceRequestOffers.specialistId });
    await tx.update(serviceRequests).set({ status: 'cancelled', updatedAt: now }).where(eq(serviceRequests.id, request.id));
    if (affected.length > 0) {
      const users = await tx
        .select({ userId: specialists.userId })
        .from(specialists)
        .where(inArray(specialists.id, affected.map((row) => row.specialistId)));
      await notify(
        tx,
        users.map(({ userId }) => ({
          recipientUserId: userId,
          type: 'request.cancelled' as const,
          title: `ألغت ${organization.name} طلباً قدّمت عليه`,
          message: requestTitle(request),
          relatedId: request.id,
          dedupeKey: `request.cancelled:${request.id}`,
        })),
      );
    }
    await audit(tx, organization.userId, 'request.cancelled', request.id);
  });
}

/* -------------------------------------------------------------------------
 * Reads
 * ---------------------------------------------------------------------- */

function toOffer(
  row: OfferRow,
  spec: { fullName: string; edu: string | null; region: string | null; years: string | null },
): Offer {
  return {
    id: row.id,
    serviceRequestId: row.serviceRequestId,
    specialistId: row.specialistId,
    specialistName: spec.fullName,
    specialistEdu: spec.edu,
    specialistRegion: spec.region,
    specialistYears: spec.years,
    durationValue: row.durationValue,
    durationUnit: row.durationUnit,
    durationLabel: formatDuration(row.durationValue, row.durationUnit),
    message: row.message,
    status: row.status as OfferStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const OFFER_ORDER: Record<OfferStatus, number> = { selected: 0, accepted: 0, submitted: 1, declined: 2, withdrawn: 3 };

/** Every offer on a request (facility view — call only after the ownership check). */
export async function listOffersForRequest(requestId: string): Promise<Offer[]> {
  const rows = await getDb()
    .select({
      offer: serviceRequestOffers,
      fullName: specialists.fullName,
      edu: specialists.edu,
      region: specialists.region,
      years: specialists.years,
    })
    .from(serviceRequestOffers)
    .innerJoin(specialists, eq(serviceRequestOffers.specialistId, specialists.id))
    .where(eq(serviceRequestOffers.serviceRequestId, requestId))
    .orderBy(asc(serviceRequestOffers.createdAt));
  return rows
    .map((row) => toOffer(row.offer, row))
    .sort((a, b) => OFFER_ORDER[a.status] - OFFER_ORDER[b.status]);
}

/** The specialist's own offer on a request (never anyone else's). */
export async function getOwnOffer(requestId: string, specialistId: string): Promise<Offer | null> {
  if (!isUuid(requestId)) return null;
  const rows = await getDb()
    .select({
      offer: serviceRequestOffers,
      fullName: specialists.fullName,
      edu: specialists.edu,
      region: specialists.region,
      years: specialists.years,
    })
    .from(serviceRequestOffers)
    .innerJoin(specialists, eq(serviceRequestOffers.specialistId, specialists.id))
    .where(and(eq(serviceRequestOffers.serviceRequestId, requestId), eq(serviceRequestOffers.specialistId, specialistId)))
    .limit(1);
  return rows[0] ? toOffer(rows[0].offer, rows[0]) : null;
}

/** Contracts of a request, newest first (facility: all; specialist: filter by party). */
export async function listContractsForRequest(requestId: string): Promise<ContractSummary[]> {
  const rows = await getDb()
    .select()
    .from(contracts)
    .where(eq(contracts.serviceRequestId, requestId))
    .orderBy(desc(contracts.createdAt));
  return rows.map(toContractSummary);
}

export async function countOffersAwaitingReview(organizationId: string): Promise<number> {
  const rows = await getDb()
    .select({ id: serviceRequestOffers.id })
    .from(serviceRequestOffers)
    .innerJoin(serviceRequests, eq(serviceRequestOffers.serviceRequestId, serviceRequests.id))
    .where(
      and(
        eq(serviceRequests.organizationId, organizationId),
        eq(serviceRequests.status, 'pending'),
        eq(serviceRequestOffers.status, 'submitted'),
      ),
    );
  return rows.length;
}

export async function countPendingContracts(party: { organizationId?: string; specialistId?: string }): Promise<number> {
  const rows = await getDb()
    .select({ id: contracts.id })
    .from(contracts)
    .where(
      and(
        eq(contracts.status, 'pending'),
        party.organizationId ? eq(contracts.organizationId, party.organizationId) : undefined,
        party.specialistId ? eq(contracts.specialistId, party.specialistId) : undefined,
      ),
    );
  return rows.length;
}
