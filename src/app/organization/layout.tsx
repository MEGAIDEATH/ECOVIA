import type { ReactNode } from 'react';

import { OrganizationDashboardHeader } from '@/features/organizations/dashboard/OrganizationDashboardHeader';
import { OrganizationDashboardProvider } from '@/features/organizations/dashboard/OrganizationDashboardProvider';

export default function OrganizationDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <OrganizationDashboardProvider>
      <div className="flex flex-col min-h-screen bg-surface">
        <OrganizationDashboardHeader />
        <div className="flex-1 p-6 relative z-10 w-full max-w-5xl mx-auto">{children}</div>
      </div>
    </OrganizationDashboardProvider>
  );
}