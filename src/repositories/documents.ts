import 'server-only';

import { and, eq, inArray, or, sql } from 'drizzle-orm';

import { getDb } from '@/db';
import { documents, organizations, specialists } from '@/db/schema';
import type { documentKind } from '@/db/schema';
import { isUuid } from '@/lib/utils/ids';

export type DocumentKind = (typeof documentKind.enumValues)[number];

export interface CreateDocumentInput {
  ownerUserId: string;
  kind: DocumentKind;
  storageKey: string;
  contentType: string;
  sizeBytes: number;
  originalName?: string | null;
}

export type DocumentRow = typeof documents.$inferSelect;

export interface DocumentMeta {
  id: string;
  kind: DocumentKind;
  contentType: string;
  sizeBytes: number;
  originalName: string | null;
  createdAt: string;
}

export function toDocumentMeta(row: DocumentRow): DocumentMeta {
  return {
    id: row.id,
    kind: row.kind,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    originalName: row.originalName,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createDocument(input: CreateDocumentInput): Promise<DocumentRow> {
  const rows = await getDb().insert(documents).values(input).returning();
  return rows[0];
}

export async function getDocumentById(id: string): Promise<DocumentRow | null> {
  if (!isUuid(id)) return null;
  const rows = await getDb().select().from(documents).where(eq(documents.id, id)).limit(1);
  return rows[0] ?? null;
}

/** Metadata (never contents) of documents, for attachment lists. */
export async function getDocumentMetas(ids: Array<string | null | undefined>): Promise<Map<string, DocumentMeta>> {
  const wanted = ids.filter((id): id is string => isUuid(id));
  if (wanted.length === 0) return new Map();
  const rows = await getDb().select().from(documents).where(inArray(documents.id, wanted));
  return new Map(rows.map((row) => [row.id, toDocumentMeta(row)]));
}

/**
 * True when the document exists, belongs to `ownerUserId` and has `kind` —
 * profile updates use it so nobody can attach another user's file.
 */
export async function isOwnDocumentOfKind(id: string, ownerUserId: string, kind: DocumentKind): Promise<boolean> {
  if (!isUuid(id)) return false;
  const rows = await getDb()
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.ownerUserId, ownerUserId), eq(documents.kind, kind)))
    .limit(1);
  return rows.length > 0;
}

/**
 * Whether an organization and a specialist have a business relationship:
 * an offer by the specialist on one of the organization's requests, a private
 * request addressed to the specialist, a contract, or a conversation. This is
 * the workflow condition for seeing each other's registration attachments
 * (specialist permit ⇄ facility commercial registration).
 */
export async function haveRelationship(organizationId: string, specialistId: string): Promise<boolean> {
  const result = await getDb().execute<{ related: boolean }>(sql`
    select (
      exists(
        select 1 from service_request_offers o
        join service_requests r on r.id = o.service_request_id
        where r.organization_id = ${organizationId} and o.specialist_id = ${specialistId}
      )
      or exists(
        select 1 from service_requests r
        where r.organization_id = ${organizationId} and r.target_specialist_id = ${specialistId}
      )
      or exists(select 1 from contracts c where c.organization_id = ${organizationId} and c.specialist_id = ${specialistId})
      or exists(select 1 from conversations v where v.organization_id = ${organizationId} and v.specialist_id = ${specialistId})
    ) as related
  `);
  return Boolean(result.rows[0]?.related);
}

export interface DocumentViewer {
  userId: string;
  isAdmin: boolean;
  /** Only APPROVED profiles are passed here. */
  approvedSpecialistId: string | null;
  approvedOrganizationId: string | null;
}

/**
 * Access policy for stored files (enforced by GET /api/files/[id]):
 * 1. the owner and administrators always;
 * 2. the document must be attached to an APPROVED profile, otherwise nobody else;
 * 3. specialist photo / CV file → any approved organization (directory);
 *    specialist permit (license) → approved organizations with a relationship;
 * 4. facility logo → any approved specialist (requests show it);
 *    facility commercial registration → approved specialists with a relationship.
 */
export async function canViewDocument(viewer: DocumentViewer, doc: DocumentRow): Promise<boolean> {
  if (doc.ownerUserId === viewer.userId || viewer.isAdmin) return true;
  const db = getDb();

  if (doc.kind === 'profile_image' || doc.kind === 'resume' || doc.kind === 'license') {
    if (!viewer.approvedOrganizationId && doc.kind !== 'profile_image') return false;
    const [spec] = await db
      .select({ id: specialists.id })
      .from(specialists)
      .where(
        and(
          eq(specialists.userId, doc.ownerUserId),
          eq(specialists.status, 'approved'),
          or(
            eq(specialists.profileImageId, doc.id),
            eq(specialists.resumeDocumentId, doc.id),
            eq(specialists.licenseDocumentId, doc.id),
          ),
        ),
      )
      .limit(1);
    if (spec) {
      if (!viewer.approvedOrganizationId) return false;
      if (doc.kind === 'license') return haveRelationship(viewer.approvedOrganizationId, spec.id);
      return true;
    }
  }

  if (doc.kind === 'profile_image' || doc.kind === 'commercial_registration') {
    if (!viewer.approvedSpecialistId) return false;
    const [org] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(
        and(
          eq(organizations.userId, doc.ownerUserId),
          eq(organizations.status, 'approved'),
          or(eq(organizations.profileImageId, doc.id), eq(organizations.crDocumentId, doc.id)),
        ),
      )
      .limit(1);
    if (!org) return false;
    if (doc.kind === 'commercial_registration') return haveRelationship(org.id, viewer.approvedSpecialistId);
    return true;
  }

  return false;
}
