import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { entryPathFor } from '@/lib/auth/access';
import { getCurrentAccount } from '@/lib/auth/policies';

export const metadata: Metadata = { title: 'لوحة التحكم', robots: { index: false } };

/**
 * Server-side entry point after login / signup / password setup. Approved
 * accounts land in their workspace; pending or rejected ones on their own CV
 * (specialist) or facility profile — never on a waiting page; accounts with
 * no profile yet go to the account-type choice (no redirect loop).
 */
export default async function DashboardEntry() {
  const account = await getCurrentAccount();
  if (!account) redirect('/login');
  redirect(entryPathFor(account.facts, account.activeRole));
}
