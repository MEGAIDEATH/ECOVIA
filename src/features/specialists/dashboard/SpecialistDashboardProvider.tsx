'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { useDashboardGuard } from '@/features/auth/useDashboardGuard';
import { FullPageSpinner } from '@/components/layout/FullPageSpinner';
import type { Specialist } from '@/types';

interface SpecialistDashboardContextValue {
  specialist: Specialist | null;
  refresh: () => Promise<void>;
}

const SpecialistDashboardContext = createContext<SpecialistDashboardContextValue | null>(null);

export function useSpecialistDashboard(): SpecialistDashboardContextValue {
  const context = useContext(SpecialistDashboardContext);
  if (!context) {
    throw new Error('useSpecialistDashboard must be used within a SpecialistDashboardProvider');
  }
  return context;
}

/**
 * Guards /specialist/* (approved specialists only) and exposes the profile
 * to every tab without re-fetching per page.
 */
export function SpecialistDashboardProvider({ children }: { children: ReactNode }) {
  const { ready, profile, refresh } = useDashboardGuard('spec');

  const value = useMemo(
    () => ({ specialist: profile as Specialist | null, refresh }),
    [profile, refresh],
  );

  if (!ready) return <FullPageSpinner />;

  return (
    <SpecialistDashboardContext.Provider value={value}>
      {children}
    </SpecialistDashboardContext.Provider>
  );
}