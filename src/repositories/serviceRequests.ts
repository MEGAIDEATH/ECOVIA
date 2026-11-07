import 'server-only';

import { and, desc, eq } from 'drizzle-orm';

import { getDb } from '@/db';
import { organizations, serviceRequests } from '@/db/schema';
import type { ServiceRequest, ServiceRequestStatus } from '@/types';

type Row = typeof serviceRequests.$inferSelect;

function toServiceRequest(row: Row, orgName?: string): ServiceRequest {
  return {
    id: row.id,
    organizationId: row.organizationId,
    specialistId: row.specialistId,
    serviceCategory: row.serviceCategory,
    serviceName: row.serviceName,
    region: row.region,
    city: row.city,
    duration: row.duration,
    description: row.description,
    status: row.status as ServiceRequestStatus,
    rejectionReason: row.rejectionReason,
    conversationId: row.conversationId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    organizationName: orgName,
  };
}

export async function createServiceRequest(input: {
  organizationId: string;
  serviceCategory: string;
  serviceName: string;
  region: string;
  city: string;
  duration: string;
  description?: string | null;
}): Promise<ServiceRequest> {
  const db = getDb();
  const rows = await db
    .insert(serviceRequests)
    .values({
      organizationId: input.organizationId,
      serviceCategory: input.serviceCategory,
      serviceName: input.serviceName,
      region: input.region,
      city: input.city,
      duration: input.duration,
      description: input.description ?? null,
    })
    .returning();
  return toServiceRequest(rows[0]);
}

export async function listServiceRequestsForOrganization(organizationId: string): Promise<ServiceRequest[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.organizationId, organizationId))
    .orderBy(desc(serviceRequests.createdAt));
  return rows.map((r) => toServiceRequest(r));
}

export async function listAvailableServiceRequestsForSpecialist(): Promise<ServiceRequest[]> {
  const db = getDb();
  const rows = await db
    .select({ req: serviceRequests, orgName: organizations.orgName })
    .from(serviceRequests)
    .innerJoin(organizations, eq(serviceRequests.organizationId, organizations.id))
    .where(eq(serviceRequests.status, 'pending'))
    .orderBy(desc(serviceRequests.createdAt));
  return rows.map((r) => toServiceRequest(r.req, r.orgName));
}

export async function getServiceRequestById(id: string): Promise<ServiceRequest | null> {
  const db = getDb();
  const rows = await db
    .select({ req: serviceRequests, orgName: organizations.orgName })
    .from(serviceRequests)
    .innerJoin(organizations, eq(serviceRequests.organizationId, organizations.id))
    .where(eq(serviceRequests.id, id))
    .limit(1);
  if (!rows[0]) return null;
  return toServiceRequest(rows[0].req, rows[0].orgName);
}

export async function acceptServiceRequest(id: string, specialistId: string): Promise<ServiceRequest | null> {
  const db = getDb();
  const updated = await db
    .update(serviceRequests)
    .set({ specialistId, status: 'accepted', updatedAt: new Date() })
    .where(and(eq(serviceRequests.id, id), eq(serviceRequests.status, 'pending')))
    .returning();
  if (updated.length === 0) return null;
  return toServiceRequest(updated[0]);
}

export async function rejectServiceRequest(id: string, reason: string): Promise<ServiceRequest | null> {
  const db = getDb();
  const updated = await db
    .update(serviceRequests)
    .set({ status: 'rejected', rejectionReason: reason, updatedAt: new Date() })
    .where(and(eq(serviceRequests.id, id), eq(serviceRequests.status, 'pending')))
    .returning();
  if (updated.length === 0) return null;
  return toServiceRequest(updated[0]);
}

export async function updateServiceRequestStatus(id: string, status: ServiceRequestStatus): Promise<ServiceRequest | null> {
  const db = getDb();
  const updated = await db
    .update(serviceRequests)
    .set({ status, updatedAt: new Date() })
    .where(eq(serviceRequests.id, id))
    .returning();
  if (updated.length === 0) return null;
  return toServiceRequest(updated[0]);
}

export async function setServiceRequestConversation(id: string, conversationId: string): Promise<void> {
  const db = getDb();
  await db.update(serviceRequests).set({ conversationId, updatedAt: new Date() }).where(eq(serviceRequests.id, id));
}
