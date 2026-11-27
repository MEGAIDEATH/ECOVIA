import type { Metadata } from 'next';

import { NotificationsPage } from '@/features/notifications/NotificationsPage';
import { requireWorkspacePage } from '@/lib/auth/policies';
import { firstParam, type SearchParams } from '@/lib/searchParams';
import { parsePage } from '@/lib/serviceRequests';

export const metadata: Metadata = { title: 'الإشعارات' };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const { account } = await requireWorkspacePage('org', 'approved', '/organization/notifications');
  return (
    <NotificationsPage
      userId={account.user.id}
      basePath="/organization/notifications"
      page={parsePage(firstParam((await searchParams).page))}
    />
  );
}
