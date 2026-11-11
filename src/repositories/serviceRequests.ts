import 'server-only';

import { and, desc, eq, inArray, isNotNull, ne, notExists, sql } from 'drizzle-orm';

import { getDb } from '@/db';
import { organizations, serviceRequestDeclines, serviceRequests, specialists } from '@/db/schema';
import type { DurationUnit } from '@/lib/serviceRequests';
import type { ServiceRequest, ServiceRequestStatus } from '@/types';

type Row = typeof serviceRequests.$inferSelect;

function toServiceRequest(
  row: Row,
  extra: { organizationName?: string | null; specialistName?: string | null; declinedByMe?: boolean } = {},
): ServiceRequest {
  return {
    id: row.id,
    organizationId: row.organizationId,
    specialistId: row.specialistId,
    serviceName: row.serviceName,
    cost: row.cost,
    durationValue: row.durationValue,
    durationUnit: row.durationUnit,
    duration: row.duration,
    region: row.region,
    serviceCategory: row.serviceCategory,
    city: row.city,
    description: row.description,
    status: row.status as ServiceRequestStatus,
    rejectionReason: row.rejectionReason,
    conversationId: row.conversationId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    organizationName: extra.organizationName ?? undefined,
    specialistName: extra.specialistName ?? undefined,
    ...(extra.declinedByMe ? { declinedByMe: true } : {}),
  };
}

/** Base select joining the display names of both parties. */
function selectWithNames() {
  return getDb()
    .select({ req: serviceRequests, orgName: organizations.orgName, specName: specialists.fullName })
    .from(serviceRequests)
    .innerJoin(organizations, eq(serviceRequests.organizationId, organizations.id))
    .leftJoin(specialists, eq(serviceRequests.specialistId, specialists.id));
}

type NamedRow = { req: Row; orgName: string; specName: string | null };
const fromNamed = (r: NamedRow, declinedByMe = false) =>
  toServiceRequest(r.req, { organizationName: r.orgName, specialistName: r.specName, declinedByMe });

export interface CreateServiceRequestInput {
  organizationId: string;
  serviceName: string;
  cost: number;
  durationValue: number;
  durationUnit: DurationUnit;
  durationLabel: string;
  region: string;
  city?: string | null;
  serviceCategory?: string | null;
  description?: string | null;
}

export async function createServiceRequest(input: CreateServiceRequestInput): Promise<ServiceRequest> {
  const rows = await getDb()
    .insert(serviceRequests)
    .values({
      organizationId: input.organizationId,
      serviceName: input.serviceName,
      cost: input.cost,
      durationValue: input.durationValue,
      durationUnit: input.durationUnit,
      duration: input.durationLabel,
      region: input.region,
      city: input.city ?? null,
      serviceCategory: input.serviceCategory ?? null,
      description: input.description ?? null,
    })
    .returning();
  return toServiceRequest(rows[0]);
}

/** Everything an organization published, newest first (all lifecycle stages). */
export async function listServiceRequestsForOrganization(organizationId: string): Promise<ServiceRequest[]> {
  const rows = await selectWithNames()
    .where(eq(serviceRequests.organizationId, organizationId))
    .orderBy(desc(serviceRequests.createdAt));
  return rows.map((r) => fromNamed(r));
}

/**
 * A specialist's view of the marketplace, without duplicates:
 * 1. open requests (pending) they have not declined,
 * 2. requests they took (any later status),
 * 3. open requests they declined (flagged `declinedByMe`).
 */
export async function listServiceRequestsForSpecialist(specialistId: string): Promise<ServiceRequest[]> {
  const db = getDb();
  const declinedByMe = db
    .select({ one: sql`1` })
    .from(serviceRequestDeclines)
    .where(
      and(
        eq(serviceRequestDeclines.serviceRequestId, serviceRequests.id),
        eq(serviceRequestDeclines.specialistId, specialistId),
      ),
    );

  const [open, mine, declined] = await Promise.all([
    selectWithNames()
      .where(and(eq(serviceRequests.status, 'pending'), notExists(declinedByMe)))
      .orderBy(desc(serviceRequests.createdAt)),
    selectWithNames()
      .where(eq(serviceRequests.specialistId, specialistId))
      .orderBy(desc(serviceRequests.updatedAt)),
    db
      .select({ req: serviceRequests, orgName: organizations.orgName, specName: sql<string | null>`null` })
      .from(serviceRequestDeclines)
      .innerJoin(serviceRequests, eq(serviceRequestDeclines.serviceRequestId, serviceRequests.id))
      .innerJoin(organizations, eq(serviceRequests.organizationId, organizations.id))
      .where(and(eq(serviceRequestDeclines.specialistId, specialistId), eq(serviceRequests.status, 'pending')))
      .orderBy(desc(serviceRequestDeclines.createdAt)),
  ]);

  return [...open.map((r) => fromNamed(r)), ...mine.map((r) => fromNamed(r)), ...declined.map((r) => fromNamed(r, true))];
}

export async function getServiceRequestById(id: string): Promise<ServiceRequest | null> {
  const rows = await selectWithNames().where(eq(serviceRequests.id, id)).limit(1);
  return rows[0] ? fromNamed(rows[0]) : null;
}

export async function hasSpecialistDeclined(id: string, specialistId: string): Promise<boolean> {
  const rows = await getDb()
    .select({ id: serviceRequestDeclines.serviceRequestId })
    .from(serviceRequestDeclines)
    .where(and(eq(serviceRequestDeclines.serviceRequestId, id), eq(serviceRequestDeclines.specialistId, specialistId)))
    .limit(1);
  return rows.length > 0;
}

/** First specialist to accept wins: the status guard makes this race-safe. */
export async function acceptServiceRequest(id: string, specialistId: string): Promise<ServiceRequest | null> {
  const updated = await getDb()
    .update(serviceRequests)
    .set({ specialistId, status: 'accepted', updatedAt: new Date() })
    .where(and(eq(serviceRequests.id, id), eq(serviceRequests.status, 'pending')))
    .returning();
  return updated[0] ? toServiceRequest(updated[0]) : null;
}

/** Personal decline: the request stays open for every other specialist. */
export async function declineServiceRequest(id: string, specialistId: string, reason: string): Promise<void> {
  await getDb()
    .insert(serviceRequestDeclines)
    .values({ serviceRequestId: id, specialistId, reason })
    .onConflictDoUpdate({
      target: [serviceRequestDeclines.serviceRequestId, serviceRequestDeclines.specialistId],
      set: { reason, createdAt: new Date() },
    });
}

/** The publishing organization withdraws a request nobody has taken yet. */
export async function cancelServiceRequest(id: string, organizationId: string): Promise<ServiceRequest | null> {
  const updated = await getDb()
    .update(serviceRequests)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(
      and(
        eq(serviceRequests.id, id),
        eq(serviceRequests.organizationId, organizationId),
        eq(serviceRequests.status, 'pending'),
      ),
    )
    .returning();
  return updated[0] ? toServiceRequest(updated[0]) : null;
}

/** Guarded lifecycle step: only moves from `from` to `to`. */
export async function transitionServiceRequest(
  id: string,
  from: ServiceRequestStatus,
  to: ServiceRequestStatus,
): Promise<ServiceRequest | null> {
  const updated = await getDb()
    .update(serviceRequests)
    .set({ status: to, updatedAt: new Date() })
    .where(and(eq(serviceRequests.id, id), eq(serviceRequests.status, from)))
    .returning();
  return updated[0] ? toServiceRequest(updated[0]) : null;
}

export async function setServiceRequestConversation(id: string, conversationId: string): Promise<void> {
  await getDb()
    .update(serviceRequests)
    .set({ conversationId, updatedAt: new Date() })
    .where(eq(serviceRequests.id, id));
}

export interface RecentSpecialist {
  specialistId: string;
  fullName: string;
  edu: string | null;
  city: string | null;
  lastInteractionAt: string;
  lastServiceName: string;
  lastStatus: ServiceRequestStatus;
  engagements: number;
}

/**
 * Specialists who took one of the organization's requests, one entry per
 * specialist, most recent interaction first.
 */
export async function listRecentSpecialistsForOrganization(organizationId: string, limit = 6): Promise<RecentSpecialist[]> {
  const db = getDb();
  const rows = await db
    .select({
      specialistId: serviceRequests.specialistId,
      lastAt: sql<Date>`max(${serviceRequests.updatedAt})`.as('last_at'),
      engagements: sql<number>`count(*)::int`.as('engagements'),
    })
    .from(serviceRequests)
    .where(
      and(
        eq(serviceRequests.organizationId, organizationId),
        isNotNull(serviceRequests.specialistId),
        ne(serviceRequests.status, 'pending'),
      ),
    )
    .groupBy(serviceRequests.specialistId)
    .orderBy(sql`max(${serviceRequests.updatedAt}) desc`)
    .limit(limit);

  const ids = rows.map((r) => r.specialistId).filter((id): id is string => Boolean(id));
  if (ids.length === 0) return [];

  const [profiles, latest] = await Promise.all([
    db
      .select({ id: specialists.id, fullName: specialists.fullName, edu: specialists.edu, city: specialists.city })
      .from(specialists)
      .where(inArray(specialists.id, ids)),
    db
      .selectDistinctOn([serviceRequests.specialistId], {
        specialistId: serviceRequests.specialistId,
        serviceName: serviceRequests.serviceName,
        status: serviceRequests.status,
      })
      .from(serviceRequests)
      .where(and(eq(serviceRequests.organizationId, organizationId), inArray(serviceRequests.specialistId, ids)))
      .orderBy(serviceRequests.specialistId, desc(serviceRequests.updatedAt)),
  ]);
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const latestById = new Map(latest.map((l) => [l.specialistId, l]));

  return rows.flatMap((row) => {
    const profile = row.specialistId ? profileById.get(row.specialistId) : undefined;
    const last = row.specialistId ? latestById.get(row.specialistId) : undefined;
    if (!profile || !last) return [];
    return [
      {
        specialistId: profile.id,
        fullName: profile.fullName,
        edu: profile.edu,
        city: profile.city,
        lastInteractionAt: new Date(row.lastAt).toISOString(),
        lastServiceName: last.serviceName,
        lastStatus: last.status as ServiceRequestStatus,
        engagements: row.engagements,
      },
    ];
  });
}
