import 'server-only';

import { eq } from 'drizzle-orm';

import { getDb } from '@/db';
import { documents } from '@/db/schema';
import type { documentKind } from '@/db/schema';

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

export async function createDocument(input: CreateDocumentInput): Promise<DocumentRow> {
  const rows = await getDb().insert(documents).values(input).returning();
  return rows[0];
}

export async function getDocumentById(id: string): Promise<DocumentRow | null> {
  const rows = await getDb().select().from(documents).where(eq(documents.id, id)).limit(1);
  return rows[0] ?? null;
}

/**
 * Notes on authorization for stored documents (enforced by the file route, not
 * here — this function only reports the facts):
 *   - the owner can always read their own document;
 *   - an approved organization may read an *approved* specialist's CV/photo;
 *   - admins may read anything.
 * The route combines this with the profile lookups below.
 */
export async function getDocumentOwnerUserId(id: string): Promise<string | null> {
  const document = await getDocumentById(id);
  return document?.ownerUserId ?? null;
}
