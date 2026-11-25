/**
 * Pure authorization decisions (no I/O) — the single source of truth for who
 * may enter which workspace and where an account lands. Server code loads the
 * facts (session + profiles) and asks these functions; tests exercise them
 * directly.
 *
 * Canonical approval rule: a profile is approved if and only if its
 * `status === 'approved'`. `pending` and `rejected` profiles are "unapproved":
 * they may use their own CV / facility profile and log out, nothing else.
 * There is no separate `isApproved` flag in this schema, so the two can never
 * contradict each other.
 */
import type { AccountStatus, UserRole } from '@/types';

export interface ProfileFact {
  id: string;
  status: AccountStatus;
}

export interface AccountFacts {
  userId: string;
  isAdmin: boolean;
  specialist: ProfileFact | null;
  organization: ProfileFact | null;
}

/** Name of the cookie that remembers which of the user's own profiles is active. */
export const ACTIVE_ROLE_COOKIE = 'ecovia_active_role';

export function isApprovedStatus(status: AccountStatus | null | undefined): boolean {
  return status === 'approved';
}

export function parseRole(value: unknown): UserRole | null {
  return value === 'spec' || value === 'org' ? value : null;
}

export function profileFor(account: AccountFacts, role: UserRole): ProfileFact | null {
  return role === 'spec' ? account.specialist : account.organization;
}

/** Roles the account actually owns (never more than its profiles). */
export function ownedRoles(account: AccountFacts): UserRole[] {
  const roles: UserRole[] = [];
  if (account.specialist) roles.push('spec');
  if (account.organization) roles.push('org');
  return roles;
}

/**
 * The active context: the preferred role when the account owns it, otherwise
 * the first owned profile (specialist first, matching the legacy order).
 * A client-supplied preference can only choose among owned profiles.
 */
export function resolveActiveRole(account: AccountFacts, preferred: UserRole | null): UserRole | null {
  const owned = ownedRoles(account);
  if (preferred && owned.includes(preferred)) return preferred;
  return owned[0] ?? null;
}

export const WORKSPACE_BASE: Record<UserRole, string> = { spec: '/specialist', org: '/organization' };

/** Where an unapproved account manages its own data (its "CV page"). */
export const OWN_PROFILE_PATH: Record<UserRole, string> = {
  spec: '/specialist/cv',
  org: '/organization/profile',
};

/** Landing page for a profile: its workspace when approved, its own CV/profile otherwise. */
export function homePathFor(role: UserRole, status: AccountStatus): string {
  return isApprovedStatus(status) ? WORKSPACE_BASE[role] : OWN_PROFILE_PATH[role];
}

/** Post-login / post-signup destination for an authenticated account. */
export function entryPathFor(account: AccountFacts, preferred: UserRole | null): string {
  const role = resolveActiveRole(account, preferred);
  if (!role) return account.isAdmin ? '/admin' : '/choose-role';
  const profile = profileFor(account, role)!;
  return homePathFor(role, profile.status);
}

export type WorkspaceRequirement = 'any' | 'approved';

export type WorkspaceDecision =
  | { kind: 'allow'; role: UserRole; profile: ProfileFact }
  | { kind: 'redirect'; to: string };

/**
 * Decides a page request inside a workspace.
 * - no session          → /login?next=<path>
 * - no profile for role → the account's own entry page (other workspace,
 *                          /admin or /choose-role) — never a loop
 * - unapproved profile on an approved-only page → its own CV/profile page
 */
export function decideWorkspaceAccess(
  account: AccountFacts | null,
  role: UserRole,
  requirement: WorkspaceRequirement,
  currentPath: string,
): WorkspaceDecision {
  if (!account) return { kind: 'redirect', to: `/login?next=${encodeURIComponent(currentPath)}` };
  const profile = profileFor(account, role);
  if (!profile) return { kind: 'redirect', to: entryPathFor(account, null) };
  if (requirement === 'approved' && !isApprovedStatus(profile.status)) {
    return { kind: 'redirect', to: OWN_PROFILE_PATH[role] };
  }
  return { kind: 'allow', role, profile };
}

/** API-level decision: the status code an endpoint must answer with (null = allowed). */
export function apiAccessStatus(
  account: AccountFacts | null,
  role: UserRole,
  requirement: WorkspaceRequirement,
): 401 | 403 | null {
  if (!account) return 401;
  const profile = profileFor(account, role);
  if (!profile) return 403;
  if (requirement === 'approved' && !isApprovedStatus(profile.status)) return 403;
  return null;
}
