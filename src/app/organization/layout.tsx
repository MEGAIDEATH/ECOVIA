import type { ReactNode } from 'react';

import { OrganizationDashboardHeader } from '@/features/organizations/dashboard/OrganizationDashboardHeader';
import { OrganizationDashboardProvider } from '@/features/organizations/dashboard/OrganizationDashboardProvider';

export default function OrganizationDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <OrganizationDashboardProvider>
      <div className="flex flex-col min-h-screen bg-surface">
        <OrganizationDashboardHeader />
        <main className="container-brand flex-1 py-8 md:py-10">{children}</main>
      </div>
    </OrganizationDashboardProvider>
  );
}