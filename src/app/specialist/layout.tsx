import type { ReactNode } from 'react';

import { SpecialistDashboardHeader } from '@/features/specialists/dashboard/SpecialistDashboardHeader';
import { SpecialistDashboardProvider } from '@/features/specialists/dashboard/SpecialistDashboardProvider';

export default function SpecialistDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SpecialistDashboardProvider>
      <div className="flex flex-col min-h-screen bg-surface">
        <SpecialistDashboardHeader />
        <main className="container-brand flex-1 py-8 md:py-10">{children}</main>
      </div>
    </SpecialistDashboardProvider>
  );
}