'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { UserRole } from '@/types';

/** Draft state shared across the multi-step registration flow (replaces `window.tData`). */
export interface RegistrationDraft {
  // Specialist (step 1 + step 2)
  fullName: string;
  nationalId: string;
  email: string;
  phone: string;
  license: string;
  issueDate: string;
  licenseFile: File | null;
  // Organization
  orgName: string;
  crNumber: string;
  orgPhone: string;
  orgDesc: string;
  crFile: File | null;
}

const EMPTY_DRAFT: RegistrationDraft = {
  fullName: '',
  nationalId: '',
  email: '',
  phone: '',
  license: '',
  issueDate: '',
  licenseFile: null,
  orgName: '',
  crNumber: '',
  orgPhone: '',
  orgDesc: '',
  crFile: null,
};

interface RegistrationContextValue {
  role: UserRole;
  draft: RegistrationDraft;
  update: (patch: Partial<RegistrationDraft>) => void;
}

const RegistrationContext = createContext<RegistrationContextValue | null>(null);

export function useRegistrationDraft(): RegistrationContextValue {
  const context = useContext(RegistrationContext);
  if (!context) {
    throw new Error('useRegistrationDraft must be used within a RegistrationProvider');
  }
  return context;
}

interface RegistrationProviderProps {
  role: UserRole;
  children: ReactNode;
}

/**
 * Mounted once per registration branch (specialist / organization layouts),
 * so state survives step navigation exactly like the legacy `window.tData`
 * did — and resets naturally when the user leaves the flow.
 */
export function RegistrationProvider({ role, children }: RegistrationProviderProps) {
  const [draft, setDraft] = useState<RegistrationDraft>(EMPTY_DRAFT);

  const update = useCallback((patch: Partial<RegistrationDraft>) => {
    setDraft((previous) => ({ ...previous, ...patch }));
  }, []);

  const value = useMemo(
    () => ({ role, draft, update }),
    [role, draft, update],
  );

  return (
    <RegistrationContext.Provider value={value}>{children}</RegistrationContext.Provider>
  );
}