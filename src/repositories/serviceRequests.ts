import 'server-only';

import { and, count, desc, eq, exists, inArray, ne, notExists, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { getDb } from '@/db';
import {
  accountEvents,
  organizations,
  serviceRequestDeclines,
  serviceRequestOffers,
  serviceRequests,
  specialists,
} from '@/db/schema';
import type { RequestFacts } from '@/lib/marketplace/rules';
import {
  CATEGORY_STATUSES,
  PAGE_SIZE,
  type RequestCategory,
  type SpecialistRequestTab,
} from '@/lib/serviceRequests';
import { requestTitle } from '@/lib/serviceTypes';
import { isUuid } from '@/lib/utils/ids';
import type { ServiceRequestInput } from '@/lib/validation/marketplace';
import type { OfferStatus, ServiceRequest, ServiceRequestStatus } from '@/types';

import { notify, notifyRegionalSpecialists } from './notifications';

type Row = typeof serviceRequests.$inferSelect;

const targetSpecialist = alias(specialists, 'target_specialist');

/** Active offers (still competing) for a request row in the outer query. */
const activeOfferCount = sql<number>`(
  select count(*)::int from service_request_offers o
  where o.service_request_id = ${serviceRequests.id} and o.status in ('submitted', 'selected')
)`;

const pendingContractExists = sql<boolean>`exists(
  select 1 from contracts c where c.service_request_id = ${serviceRequests.id} and c.status = 'pending'
)`;

function baseSelect() {
  return getDb()
    .select({
      req: serviceRequests,
      orgName: organizations.orgName,
      orgUserId: organizations.userId,
      specName: specialists.fullName,
      targetName: targetSpecialist.fullName,
      offerCount: activeOfferCount,
      hasPendingContract: pendingContractExists,
    })
    .from(serviceRequests)
    .innerJoin(organizations, eq(serviceRequests.organizationId, organizations.id))
    .leftJoin(specialists, eq(serviceRequests.specialistId, specialists.id))
    .leftJoin(targetSpecialist, eq(serviceRequests.targetSpecialistId, targetSpecialist.id));
}

type BaseRow = Awaited<ReturnType<ReturnType<typeof baseSelect>['execute']>>[number];

function toServiceRequest(row: Row, extra: Partial<ServiceRequest> = {}): ServiceRequest {
  return {
    id: row.id,
    organizationId: row.organizationId,
    specialistId: row.specialistId,
    serviceTypes: row.serviceTypes ?? [],
    activityDescription: row.activityDescription,
    notes: row.notes,
    visibility: row.visibility,
    targetSpecialistId: row.targetSpecialistId,
    region: row.region,
    city: row.city,
    status: row.status as ServiceRequestStatus,
    rejectionReason: row.rejectionReason,
    conversationId: row.conversationId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    serviceName: row.serviceName,
    serviceCategory: row.serviceCategory,
    cost: row.cost,
    duration: row.duration,
    description: row.description,
    ...extra,
  };
}

function fromBase(row: BaseRow, extra: Partial<ServiceRequest> = {}): ServiceRequest {
  return toServiceRequest(row.req, {
    organizationName: row.orgName,
    specialistName: row.specName ?? undefined,
    targetSpecialistName: row.targetName ?? undefined,
    offerCount: Number(row.offerCount ?? 0),
    hasPendingContract: Boolean(row.hasPendingContract),
    ...extra,
  });
}

export function requestFacts(row: Row, organizationUserId: string): RequestFacts {
  return {
    organizationId: row.organizationId,
    organizationUserId,
    visibility: row.visibility,
    targetSpecialistId: row.targetSpecialistId,
    status: row.status as ServiceRequestStatus,
    specialistId: row.specialistId,
  };
}

/* -------------------------------------------------------------------------
 * Creation (+ notifications in the same transaction)
 * ---------------------------------------------------------------------- */

export interface CreateRequestContext {
  organizationId: string;
  organizationUserId: string;
  organizationName: string;
  /** Approved, verified target for a private request. */
  target: { id: string; userId: string } | null;
}

export async function createServiceRequest(
  context: CreateRequestContext,
  input: ServiceRequestInput,
): Promise<{ request: ServiceRequest; notified: number }> {
  return getDb().transaction(async (tx) => {
    const [row] = await tx
      .insert(serviceRequests)
      .values({
        organizationId: context.organizationId,
        serviceTypes: input.serviceTypes,
        activityDescription: input.activityDescription,
        notes: input.notes,
        region: input.regionName,
        city: input.city,
        visibility: context.target ? 'private' : 'public',
        targetSpecialistId: context.target?.id ?? null,
      })
      .returning();

    const title = requestTitle(row);
    let notified = 0;
    if (context.target) {
      await notify(tx, {
        recipientUserId: context.target.userId,
        type: 'request.private',
        title: `طلب خاص من ${context.organizationName}`,
        message: title,
        relatedId: row.id,
        dedupeKey: `request.private:${row.id}`,
      });
      notified = 1;
    } else {
      notified = await notifyRegionalSpecialists(tx, {
        requestId: row.id,
        regionName: row.region,
        excludeUserId: context.organizationUserId,
        title: `طلب خدمة جديد في ${row.region}`,
        message: `${context.organizationName}: ${title}`,
      });
    }

    await tx.insert(accountEvents).values({
      actorUserId: context.organizationUserId,
      action: context.target ? 'request.published_private' : 'request.published',
      targetId: row.id,
      detail: `${row.region} · notified=${notified}`,
    });

    return { request: toServiceRequest(row, { organizationName: context.organizationName }), notified };
  });
}

/* -------------------------------------------------------------------------
 * Facility views
 * ---------------------------------------------------------------------- */

export async function listRequestsForOrganization(
  organizationId: string,
  category: RequestCategory,
  page = 1,
): Promise<{ items: ServiceRequest[]; hasMore: boolean }> {
  const rows = await baseSelect()
    .where(
      and(
        eq(serviceRequests.organizationId, organizationId),
        inArray(serviceRequests.status, [...CATEGORY_STATUSES[category]]),
      ),
    )
    .orderBy(desc(serviceRequests.updatedAt))
    .limit(PAGE_SIZE + 1)
    .offset((page - 1) * PAGE_SIZE);
  return { items: rows.slice(0, PAGE_SIZE).map((row) => fromBase(row)), hasMore: rows.length > PAGE_SIZE };
}

export async function countRequestsByStatusForOrganization(
  organizationId: string,
): Promise<Record<ServiceRequestStatus, number>> {
  const rows = await getDb()
    .select({ status: serviceRequests.status, n: count() })
    .from(serviceRequests)
    .where(eq(serviceRequests.organizationId, organizationId))
    .groupBy(serviceRequests.status);
  const counts: Record<ServiceRequestStatus, number> = {
    pending: 0,
    accepted: 0,
    rejected: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  };
  for (const row of rows) counts[row.status as ServiceRequestStatus] = Number(row.n);
  return counts;
}

/** The facility's own request (null when it does not exist or belongs to someone else). */
export async function getRequestForOrganization(id: string, organizationId: string): Promise<ServiceRequest | null> {
  if (!isUuid(id)) return null;
  const rows = await baseSelect()
    .where(and(eq(serviceRequests.id, id), eq(serviceRequests.organizationId, organizationId)))
    .limit(1);
  return rows[0] ? fromBase(rows[0]) : null;
}

/* -------------------------------------------------------------------------
 * Specialist views
 * ---------------------------------------------------------------------- */

export interface SpecialistViewer {
  id: string;
  userId: string;
}

function declinedBy(specialistId: string) {
  return getDb()
    .select({ one: sql`1` })
    .from(serviceRequestDeclines)
    .where(
      and(
        eq(serviceRequestDeclines.serviceRequestId, serviceRequests.id),
        eq(serviceRequestDeclines.specialistId, specialistId),
      ),
    );
}

function offeredBy(specialistId: string) {
  return getDb()
    .select({ one: sql`1` })
    .from(serviceRequestOffers)
    .where(
      and(
        eq(serviceRequestOffers.serviceRequestId, serviceRequests.id),
        eq(serviceRequestOffers.specialistId, specialistId),
      ),
    );
}

/**
 * Requests this specialist can answer right now: open public requests of
 * approved facilities (optionally one region) plus open private requests
 * addressed to them — minus their own facility's, declined, or already
 * answered ones. Private requests are never matched by region or for anyone
 * but their target.
 */
function openForSpecialist(viewer: SpecialistViewer, regionName: string | null): SQL {
  const publicClause = and(
    eq(serviceRequests.visibility, 'public'),
    regionName ? eq(serviceRequests.region, regionName) : undefined,
  )!;
  const privateClause = and(
    eq(serviceRequests.visibility, 'private'),
    eq(serviceRequests.targetSpecialistId, viewer.id),
  )!;
  return and(
    eq(serviceRequests.status, 'pending'),
    eq(organizations.status, 'approved'),
    ne(organizations.userId, viewer.userId),
    or(publicClause, privateClause),
    notExists(declinedBy(viewer.id)),
    notExists(offeredBy(viewer.id)),
  )!;
}

export async function listRequestsForSpecialist(
  viewer: SpecialistViewer,
  tab: SpecialistRequestTab,
  options: { regionName?: string | null; page?: number } = {},
): Promise<{ items: ServiceRequest[]; hasMore: boolean }> {
  const page = options.page ?? 1;
  const db = getDb();
  let rows: Array<{ base: BaseRow; offerStatus?: OfferStatus | null; declined?: boolean }>;

  if (tab === 'open') {
    const result = await baseSelect()
      .where(openForSpecialist(viewer, options.regionName ?? null))
      // Private requests addressed to me first, then newest.
      .orderBy(sql`(${serviceRequests.visibility} = 'private') desc`, desc(serviceRequests.createdAt))
      .limit(PAGE_SIZE + 1)
      .offset((page - 1) * PAGE_SIZE);
    rows = result.map((base) => ({ base }));
  } else if (tab === 'offers') {
    const result = await db
      .select({
        req: serviceRequests,
        orgName: organizations.orgName,
        orgUserId: organizations.userId,
        specName: specialists.fullName,
        targetName: targetSpecialist.fullName,
        offerCount: activeOfferCount,
        hasPendingContract: pendingContractExists,
        offerStatus: serviceRequestOffers.status,
      })
      .from(serviceRequestOffers)
      .innerJoin(serviceRequests, eq(serviceRequestOffers.serviceRequestId, serviceRequests.id))
      .innerJoin(organizations, eq(serviceRequests.organizationId, organizations.id))
      .leftJoin(specialists, eq(serviceRequests.specialistId, specialists.id))
      .leftJoin(targetSpecialist, eq(serviceRequests.targetSpecialistId, targetSpecialist.id))
      .where(eq(serviceRequestOffers.specialistId, viewer.id))
      .orderBy(desc(serviceRequestOffers.updatedAt))
      .limit(PAGE_SIZE + 1)
      .offset((page - 1) * PAGE_SIZE);
    rows = result.map(({ offerStatus, ...base }) => ({ base, offerStatus }));
  } else if (tab === 'contracted') {
    const result = await baseSelect()
      .where(eq(serviceRequests.specialistId, viewer.id))
      .orderBy(desc(serviceRequests.updatedAt))
      .limit(PAGE_SIZE + 1)
      .offset((page - 1) * PAGE_SIZE);
    rows = result.map((base) => ({ base, offerStatus: 'accepted' as const }));
  } else {
    const result = await baseSelect()
      .where(
        and(
          exists(declinedBy(viewer.id)),
          or(eq(serviceRequests.visibility, 'public'), eq(serviceRequests.targetSpecialistId, viewer.id)),
        ),
      )
      .orderBy(desc(serviceRequests.updatedAt))
      .limit(PAGE_SIZE + 1)
      .offset((page - 1) * PAGE_SIZE);
    rows = result.map((base) => ({ base, declined: true }));
  }

  return {
    items: rows.slice(0, PAGE_SIZE).map(({ base, offerStatus, declined }) =>
      fromBase(base, {
        myOfferStatus: offerStatus ?? null,
        ...(declined ? { declinedByMe: true } : {}),
        // A specialist never sees competitors' offer counts.
        offerCount: undefined,
      }),
    ),
    hasMore: rows.length > PAGE_SIZE,
  };
}

/** Badge counts for the specialist's tabs and dashboard. */
export async function countRequestsForSpecialist(viewer: SpecialistViewer): Promise<{
  open: number;
  privateOpen: number;
  activeOffers: number;
  contracted: number;
  ongoing: number;
  completed: number;
}> {
  const db = getDb();
  const [openRows, privateRows, offerRows, contractedRows] = await Promise.all([
    db
      .select({ n: count() })
      .from(serviceRequests)
      .innerJoin(organizations, eq(serviceRequests.organizationId, organizations.id))
      .where(openForSpecialist(viewer, null)),
    db
      .select({ n: count() })
      .from(serviceRequests)
      .innerJoin(organizations, eq(serviceRequests.organizationId, organizations.id))
      .where(and(openForSpecialist(viewer, null), eq(serviceRequests.visibility, 'private'))),
    db
      .select({ n: count() })
      .from(serviceRequestOffers)
      .where(
        and(
          eq(serviceRequestOffers.specialistId, viewer.id),
          inArray(serviceRequestOffers.status, ['submitted', 'selected']),
        ),
      ),
    db
      .select({ status: serviceRequests.status, n: count() })
      .from(serviceRequests)
      .where(eq(serviceRequests.specialistId, viewer.id))
      .groupBy(serviceRequests.status),
  ]);
  const byStatus = new Map(contractedRows.map((row) => [row.status, Number(row.n)]));
  return {
    open: Number(openRows[0]?.n ?? 0),
    privateOpen: Number(privateRows[0]?.n ?? 0),
    activeOffers: Number(offerRows[0]?.n ?? 0),
    contracted: contractedRows.reduce((sum, row) => sum + Number(row.n), 0),
    ongoing: (byStatus.get('accepted') ?? 0) + (byStatus.get('in_progress') ?? 0),
    completed: byStatus.get('completed') ?? 0,
  };
}

/** Raw request + owner user id, for authorization decisions. */
export async function getRequestWithFacts(
  id: string,
): Promise<{ request: ServiceRequest; facts: RequestFacts; organizationApproved: boolean } | null> {
  if (!isUuid(id)) return null;
  const rows = await getDb()
    .select({
      req: serviceRequests,
      orgName: organizations.orgName,
      orgUserId: organizations.userId,
      orgStatus: organizations.status,
      specName: specialists.fullName,
      targetName: targetSpecialist.fullName,
      offerCount: activeOfferCount,
      hasPendingContract: pendingContractExists,
    })
    .from(serviceRequests)
    .innerJoin(organizations, eq(serviceRequests.organizationId, organizations.id))
    .leftJoin(specialists, eq(serviceRequests.specialistId, specialists.id))
    .leftJoin(targetSpecialist, eq(serviceRequests.targetSpecialistId, targetSpecialist.id))
    .where(eq(serviceRequests.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    request: fromBase(row),
    facts: requestFacts(row.req, row.orgUserId),
    organizationApproved: row.orgStatus === 'approved',
  };
}

export async function hasSpecialistDeclined(id: string, specialistId: string): Promise<boolean> {
  const rows = await getDb()
    .select({ id: serviceRequestDeclines.serviceRequestId })
    .from(serviceRequestDeclines)
    .where(and(eq(serviceRequestDeclines.serviceRequestId, id), eq(serviceRequestDeclines.specialistId, specialistId)))
    .limit(1);
  return rows.length > 0;
}

/** Personal "not for me": the request stays open for every other specialist. */
export async function declineServiceRequest(id: string, specialistId: string, reason: string): Promise<void> {
  await getDb()
    .insert(serviceRequestDeclines)
    .values({ serviceRequestId: id, specialistId, reason })
    .onConflictDoUpdate({
      target: [serviceRequestDeclines.serviceRequestId, serviceRequestDeclines.specialistId],
      set: { reason, createdAt: new Date() },
    });
}

/** Removes the personal decline (the specialist changed their mind). */
export async function undoDeclineServiceRequest(id: string, specialistId: string): Promise<void> {
  await getDb()
    .delete(serviceRequestDeclines)
    .where(and(eq(serviceRequestDeclines.serviceRequestId, id), eq(serviceRequestDeclines.specialistId, specialistId)));
}

/**
 * Guarded lifecycle step by the contracted specialist: only moves from
 * `from` to `to`, only on a request contracted to `specialistId`.
 */
export async function transitionServiceRequest(
  id: string,
  specialistId: string,
  from: ServiceRequestStatus,
  to: ServiceRequestStatus,
): Promise<ServiceRequest | null> {
  return getDb().transaction(async (tx) => {
    const updated = await tx
      .update(serviceRequests)
      .set({ status: to, updatedAt: new Date() })
      .where(
        and(eq(serviceRequests.id, id), eq(serviceRequests.status, from), eq(serviceRequests.specialistId, specialistId)),
      )
      .returning();
    const row = updated[0];
    if (!row) return null;
    const [org] = await tx
      .select({ userId: organizations.userId })
      .from(organizations)
      .where(eq(organizations.id, row.organizationId))
      .limit(1);
    if (org) {
      await notify(tx, {
        recipientUserId: org.userId,
        type: 'request.status',
        title: to === 'completed' ? 'اكتمل تنفيذ الخدمة' : 'بدأ تنفيذ الخدمة',
        message: requestTitle(row),
        relatedId: row.id,
        dedupeKey: `request.status:${row.id}:${to}`,
      });
    }
    return toServiceRequest(row);
  });
}

/** Approved specialist eligible to receive a private request (never the facility's own user). */
export async function getPrivateRequestTarget(
  specialistId: string,
  excludeUserId: string,
): Promise<{ id: string; userId: string; fullName: string } | null> {
  if (!isUuid(specialistId)) return null;
  const rows = await getDb()
    .select({ id: specialists.id, userId: specialists.userId, fullName: specialists.fullName })
    .from(specialists)
    .where(and(eq(specialists.id, specialistId), eq(specialists.status, 'approved'), ne(specialists.userId, excludeUserId)))
    .limit(1);
  return rows[0] ?? null;
}
