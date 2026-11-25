import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import type { Organization, Specialist, UserRole } from '@/types';

import {
  ACTIVE_ROLE_COOKIE,
  decideWorkspaceAccess,
  isApprovedStatus,
  parseRole,
  resolveActiveRole,
  type AccountFacts,
  type WorkspaceRequirement,
} from './access';
import {
  ForbiddenError,
  getSessionUser,
  getSessionUserFromRequest,
  loadProfilesForUser,
  UnauthorizedError,
  type SessionUser,
} from './session';

/**
 * Server-side authorization policies — the ONLY place pages, layouts, Server
 * Actions and Route Handlers decide access. Identity, roles and approval are
 * always read from the database for the session's user; nothing the browser
 * sends (ids, roles, flags) can widen access.
 *
 *   requireAuthenticatedUser  → 401 when there is no valid session
 *   requireRole               → 403 when the user owns no profile of that role
 *   requireApprovedUser       → 403 when that profile is pending / rejected
 *   requireWorkspacePage      → the same rules for pages, as redirects
 *   record-level checks       → see src/lib/auth/recordAccess.ts
 */
export interface CurrentAccount {
  user: SessionUser;
  isAdmin: boolean;
  specialist: Specialist | null;
  organization: Organization | null;
  /** The owned profile currently in use (from the context cookie, validated). */
  activeRole: UserRole | null;
  facts: AccountFacts;
}

function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

async function buildAccount(user: SessionUser, preferred: UserRole | null): Promise<CurrentAccount> {
  const { specialist, organization } = await loadProfilesForUser(user.id);
  const facts: AccountFacts = {
    userId: user.id,
    isAdmin: user.role === 'admin',
    specialist: specialist ? { id: specialist.id, status: specialist.status } : null,
    organization: organization ? { id: organization.id, status: organization.status } : null,
  };
  return {
    user,
    isAdmin: facts.isAdmin,
    specialist,
    organization,
    activeRole: resolveActiveRole(facts, preferred),
    facts,
  };
}

/** The signed-in account for Server Components / Server Actions (memoized per request). */
export const getCurrentAccount = cache(async (): Promise<CurrentAccount | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const store = await cookies();
  return buildAccount(user, parseRole(store.get(ACTIVE_ROLE_COOKIE)?.value));
});

/** The signed-in account for Route Handlers. */
export async function getAccountFromRequest(request: Request): Promise<CurrentAccount | null> {
  const user = await getSessionUserFromRequest(request);
  if (!user) return null;
  return buildAccount(user, parseRole(readCookie(request.headers.get('cookie'), ACTIVE_ROLE_COOKIE)));
}

export async function requireAuthenticatedUser(request?: Request): Promise<CurrentAccount> {
  const account = request ? await getAccountFromRequest(request) : await getCurrentAccount();
  if (!account) throw new UnauthorizedError();
  return account;
}

export interface SpecialistContext {
  account: CurrentAccount;
  profile: Specialist;
}

export interface OrganizationContext {
  account: CurrentAccount;
  profile: Organization;
}

export type RoleContext<R extends UserRole> = R extends 'spec' ? SpecialistContext : OrganizationContext;

function contextFor<R extends UserRole>(account: CurrentAccount, role: R): RoleContext<R> | null {
  const profile = role === 'spec' ? account.specialist : account.organization;
  return profile ? ({ account, profile } as RoleContext<R>) : null;
}

/** The caller owns a profile of `role` (any approval state). */
export async function requireRole<R extends UserRole>(role: R, request?: Request): Promise<RoleContext<R>> {
  const account = await requireAuthenticatedUser(request);
  const context = contextFor(account, role);
  if (!context) {
    throw new ForbiddenError(role === 'spec' ? 'لا يوجد ملف أخصائي لهذا الحساب.' : 'لا يوجد ملف منشأة لهذا الحساب.');
  }
  return context;
}

export const PENDING_APPROVAL_MESSAGE = 'حسابك قيد المراجعة؛ هذه الميزة متاحة بعد اعتماد الحساب.';

/** The caller owns an APPROVED profile of `role`. Unapproved → ForbiddenError (403). */
export async function requireApprovedUser<R extends UserRole>(role: R, request?: Request): Promise<RoleContext<R>> {
  const context = await requireRole(role, request);
  if (!isApprovedStatus(context.profile.status)) throw new ForbiddenError(PENDING_APPROVAL_MESSAGE);
  return context;
}

/**
 * Page/layout guard. Redirects instead of throwing:
 * signed out → /login?next=…, wrong workspace → the account's own entry,
 * unapproved on an approved-only page → its own CV / facility profile.
 */
export async function requireWorkspacePage<R extends UserRole>(
  role: R,
  requirement: WorkspaceRequirement,
  currentPath: string,
): Promise<RoleContext<R>> {
  const account = await getCurrentAccount();
  const decision = decideWorkspaceAccess(account?.facts ?? null, role, requirement, currentPath);
  if (decision.kind === 'redirect') redirect(decision.to);
  return contextFor(account!, role)!;
}
