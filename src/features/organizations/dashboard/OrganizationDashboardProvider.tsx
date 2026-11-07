'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { useDashboardGuard } from '@/features/auth/useDashboardGuard';
import { FullPageSpinner } from '@/components/layout/FullPageSpinner';
import type { Organization } from '@/types';

interface OrganizationDashboardContextValue {
  organization: Organization | null;
  refresh: () => Promise<void>;
}

const OrganizationDashboardContext = createContext<OrganizationDashboardContextValue | null>(null);

export function useOrganizationDashboard(): OrganizationDashboardContextValue {
  const context = useContext(OrganizationDashboardContext);
  if (!context) {
    throw new Error('useOrganizationDashboard must be used within an OrganizationDashboardProvider');
  }
  return context;
}

/** Guards /organization/* (approved organizations only). */
export function OrganizationDashboardProvider({ children }: { children: ReactNode }) {
  const { ready, profile, refresh } = useDashboardGuard('org');

  const value = useMemo(
    () => ({ organization: profile as Organization | null, refresh }),
    [profile, refresh],
  );

  if (!ready) return <FullPageSpinner />;

  return (
    <OrganizationDashboardContext.Provider value={value}>
      {children}
    </OrganizationDashboardContext.Provider>
  );
}