import type { ReactNode } from 'react';

import { AppShell } from '@/components/layout/AppShell';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { isApprovedStatus } from '@/lib/auth/access';
import { toClientSession } from '@/lib/auth/clientSession';
import { getCurrentAccount, requireWorkspacePage } from '@/lib/auth/policies';
import { countUnreadNotifications } from '@/repositories/notifications';

/**
 * /organization/* — requires a facility profile (any approval state; each
 * approved-only page re-checks with `requireWorkspacePage('org', 'approved')`).
 */
export default async function OrganizationLayout({ children }: { children: ReactNode }) {
  // Signed out: every page redirects to /login?next=<its exact path> itself.
  if (!(await getCurrentAccount())) return children;
  const { account, profile } = await requireWorkspacePage('org', 'any', '/organization');
  const unread = isApprovedStatus(profile.status) ? await countUnreadNotifications(account.user.id) : 0;
  return (
    <AuthProvider initial={toClientSession(account)}>
      <AppShell role="org" account={account} unreadCount={unread}>
        {children}
      </AppShell>
    </AuthProvider>
  );
}
