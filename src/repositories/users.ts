import 'server-only';

import { eq } from 'drizzle-orm';

import { getDb } from '@/db';
import { user } from '@/db/schema';

export type UserRow = typeof user.$inferSelect;

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const rows = await getDb()
    .select()
    .from(user)
    .where(eq(user.email, email.toLowerCase()))
    .limit(1);
  return rows[0] ?? null;
}

export async function getUserById(id: string): Promise<UserRow | null> {
  const rows = await getDb().select().from(user).where(eq(user.id, id)).limit(1);
  return rows[0] ?? null;
}

/**
 * Sets the authoritative role. Called by the seed script (and by future
 * administrative tooling) — never from a request body.
 */
export async function setUserRole(userId: string, role: string): Promise<void> {
  await getDb().update(user).set({ role, updatedAt: new Date() }).where(eq(user.id, userId));
}
