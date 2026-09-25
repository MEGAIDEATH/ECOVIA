import type { ReactNode } from 'react';

import { SpecialistDashboardHeader } from '@/features/specialists/dashboard/SpecialistDashboardHeader';
import { SpecialistDashboardProvider } from '@/features/specialists/dashboard/SpecialistDashboardProvider';

export default function SpecialistDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SpecialistDashboardProvider>
      <div className="flex flex-col min-h-screen bg-surface">
        <SpecialistDashboardHeader />
        <div className="flex-1 p-6 relative z-10 w-full max-w-5xl mx-auto">{children}</div>
      </div>
    </SpecialistDashboardProvider>
  );
}