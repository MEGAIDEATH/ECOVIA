import type { ReactNode } from 'react';

import { AppShell } from '@/components/layout/AppShell';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { isApprovedStatus } from '@/lib/auth/access';
import { toClientSession } from '@/lib/auth/clientSession';
import { getCurrentAccount, requireWorkspacePage } from '@/lib/auth/policies';
import { countUnreadNotifications } from '@/repositories/notifications';

/**
 * /specialist/* — requires a specialist profile (any approval state; each
 * approved-only page re-checks with `requireWorkspacePage('spec', 'approved')`).
 */
export default async function SpecialistLayout({ children }: { children: ReactNode }) {
  // Signed out: every page redirects to /login?next=<its exact path> itself.
  if (!(await getCurrentAccount())) return children;
  const { account, profile } = await requireWorkspacePage('spec', 'any', '/specialist');
  const unread = isApprovedStatus(profile.status) ? await countUnreadNotifications(account.user.id) : 0;
  return (
    <AuthProvider initial={toClientSession(account)}>
      <AppShell role="spec" account={account} unreadCount={unread}>
        {children}
      </AppShell>
    </AuthProvider>
  );
}
