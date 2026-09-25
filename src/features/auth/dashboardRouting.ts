import type { AccountStatus, UserRole } from '@/types';

export interface AccountSnapshot {
  role: UserRole;
  status: AccountStatus;
}

export type DashboardDestination =
  | { type: 'dashboard'; role: UserRole }
  | { type: 'waiting'; role: UserRole }
  | { type: 'none' };

/**
 * Port of the legacy `checkAndGoToDashboard()` role-resolution order:
 *   1. preferred org + org document exists  → organization
 *   2. preferred spec + spec document exists → specialist
 *   3. spec document exists                 → specialist
 *   4. org document exists                  → organization
 * Approved accounts go to their dashboard, pending ones to the waiting room.
 */
export function resolveDestination(
  preferredRole: UserRole | null,
  specialist: AccountSnapshot | null,
  organization: AccountSnapshot | null,
): DashboardDestination {
  let role: UserRole | null = null;

  if (preferredRole === 'org' && organization) role = 'org';
  else if (preferredRole === 'spec' && specialist) role = 'spec';
  else if (specialist) role = 'spec';
  else if (organization) role = 'org';

  if (!role) return { type: 'none' };

  const status = role === 'spec' ? specialist!.status : organization!.status;
  return status === 'approved' ? { type: 'dashboard', role } : { type: 'waiting', role };
}