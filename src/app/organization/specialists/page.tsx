import type { Metadata } from 'next';

import { OrganizationSpecialists } from '@/features/organizations/specialists/OrganizationSpecialists';
import { requireWorkspacePage } from '@/lib/auth/policies';
import { listApprovedSpecialists } from '@/repositories/profiles';

export const metadata: Metadata = { title: 'دليل الكفاءات' };

/** Competency directory: approved specialists only, loaded on the server (the viewer excluded). */
export default async function OrganizationSpecialistsPage() {
  const { account } = await requireWorkspacePage('org', 'approved', '/organization/specialists');
  const specialists = (await listApprovedSpecialists()).filter((spec) => spec.userId !== account.user.id);
  return <OrganizationSpecialists specialists={specialists} />;
}
