import 'server-only';

import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';

import { getDb } from '@/db';
import { organizations, specialists } from '@/db/schema';
import { toOrganization, toSpecialist } from '@/repositories/profiles';
import type { Organization, Specialist } from '@/types';

import { getAuth } from './index';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

/** Thrown by every `require*` helper when the request has no valid session (HTTP 401). */
export class UnauthorizedError extends Error {
  constructor(message = 'غير مصرح بالوصول.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/** Authenticated but not allowed: wrong role, unapproved account, foreign record (HTTP 403). */
export class ForbiddenError extends Error {
  constructor(message = 'غير مصرح بالوصول.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Resolves the signed-in user from a Request's cookies. Identity and role are
 * read from the database — never from the browser payload or the URL.
 */
export async function getSessionUserFromRequest(request: Request): Promise<SessionUser | null> {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user) return null;
  const result = session.user as { id: string; email: string; name?: string | null; role?: string };
  return {
    id: result.id,
    email: result.email,
    name: result.name ?? '',
    role: result.role ?? 'user',
  };
}

/** Session lookup for server components / server actions (Next headers store). */
export async function getSessionUser(): Promise<SessionUser | null> {
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session?.user) return null;
  const result = session.user as { id: string; email: string; name?: string | null; role?: string };
  return {
    id: result.id,
    email: result.email,
    name: result.name ?? '',
    role: result.role ?? 'user',
  };
}

/** Requested record does not exist or is outside the caller's scope (HTTP 404). */
export class NotFoundError extends Error {
  constructor(message = 'غير موجود.') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export async function requireUser(request?: Request): Promise<SessionUser> {
  const user = request ? await getSessionUserFromRequest(request) : await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

/** Admin authorization is decided server-side from the database role column. */
export async function requireAdmin(request?: Request): Promise<SessionUser> {
  const user = await requireUser(request);
  if (user.role !== 'admin') throw new ForbiddenError();
  return user;
}

export interface ProfilePair {
  specialist: Specialist | null;
  organization: Organization | null;
}

/** Loads both possible profiles for a user id (a user may own one of each). */
export async function loadProfilesForUser(userId: string): Promise<ProfilePair> {
  const db = getDb();
  const [specialistRows, organizationRows] = await Promise.all([
    db.select().from(specialists).where(eq(specialists.userId, userId)).limit(1),
    db.select().from(organizations).where(eq(organizations.userId, userId)).limit(1),
  ]);
  return {
    specialist: specialistRows[0] ? toSpecialist(specialistRows[0]) : null,
    organization: organizationRows[0] ? toOrganization(organizationRows[0]) : null,
  };
}
