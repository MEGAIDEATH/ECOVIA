import 'server-only';

import { redirect } from 'next/navigation';

import { homePathFor } from '@/lib/auth/access';
import { getCurrentAccount } from '@/lib/auth/policies';
import type { UserRole } from '@/types';

/**
 * Registration context: anonymous visitors register a new login (OTP);
 * a signed-in user adds the missing profile to their existing login. A user
 * who already owns that profile is sent to it (no duplicates).
 */
export async function registrationContext(role: UserRole): Promise<{ accountName: string } | null> {
  const account = await getCurrentAccount();
  if (!account) return null;
  const existing = role === 'spec' ? account.specialist : account.organization;
  if (existing) redirect(homePathFor(role, existing.status));
  const name = account.specialist?.fullName ?? account.organization?.orgName ?? account.user.name ?? account.user.email;
  return { accountName: name };
}
