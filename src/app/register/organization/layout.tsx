import type { ReactNode } from 'react';

import { RegistrationProvider } from '@/features/registration/RegistrationProvider';

export default function OrganizationRegisterLayout({ children }: { children: ReactNode }) {
  return <RegistrationProvider role="org">{children}</RegistrationProvider>;
}