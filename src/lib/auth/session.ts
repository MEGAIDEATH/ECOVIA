import 'server-only';

import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';

import { getDb } from '@/db';
import { organizations, specialists } from '@/db/schema';
import type { Organization, Specialist } from '@/types';

import { getAuth } from './index';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

/** Thrown by every `require*` helper when the request has no valid session. */
export class UnauthorizedError extends Error {
  constructor(message = 'غير مصرح بالوصول.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

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

/** Loads both possible profiles for a user id (legacy dashboards needed both). */
export async function loadProfilesForUser(userId: string): Promise<ProfilePair> {
  const db = getDb();
  const [specialistRows, organizationRows] = await Promise.all([
    db.select().from(specialists).where(eq(specialists.userId, userId)).limit(1),
    db.select().from(organizations).where(eq(organizations.userId, userId)).limit(1),
  ]);

  const specialist = specialistRows[0];
  const organization = organizationRows[0];

  return {
    specialist: specialist
      ? {
          id: specialist.id,
          userId: specialist.userId,
          status: specialist.status,
          fullName: specialist.fullName,
          nationalId: specialist.nationalId,
          email: specialist.email,
          phone: specialist.phone,
          license: specialist.license,
          issueDate: specialist.issueDate,
          edu: specialist.edu,
          years: specialist.years,
          exp: specialist.exp,
          portfolio: specialist.portfolio,
          profilePicId: specialist.profileImageId,
          resumeFileId: specialist.resumeDocumentId,
          licenseDocId: specialist.licenseDocumentId,
          createdAt: specialist.createdAt.toISOString(),
        }
      : null,
    organization: organization
      ? {
          id: organization.id,
          userId: organization.userId,
          status: organization.status,
          orgName: organization.orgName,
          crNumber: organization.crNumber,
          phone: organization.phone,
          orgDesc: organization.orgDesc,
          crDocId: organization.crDocumentId,
          createdAt: organization.createdAt.toISOString(),
        }
      : null,
  };
}

/** Guards specialist-only endpoints and returns the caller's own profile row. */
export async function requireSpecialist(userId: string) {
  const rows = await getDb()
    .select()
    .from(specialists)
    .where(eq(specialists.userId, userId))
    .limit(1);
  const profile = rows[0];
  if (!profile) throw new ForbiddenError('لا يوجد ملف أخصائي لهذا الحساب.');
  return profile;
}

/** Guards organization-only endpoints and returns the caller's own profile row. */
export async function requireOrganization(userId: string) {
  const rows = await getDb()
    .select()
    .from(organizations)
    .where(eq(organizations.userId, userId))
    .limit(1);
  const profile = rows[0];
  if (!profile) throw new ForbiddenError('لا يوجد ملف منشأة لهذا الحساب.');
  return profile;
}
