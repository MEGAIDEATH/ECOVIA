import type { ReactNode } from 'react';

import { RegistrationProvider } from '@/features/registration/RegistrationProvider';

export default function SpecialistRegisterLayout({ children }: { children: ReactNode }) {
  return <RegistrationProvider role="spec">{children}</RegistrationProvider>;
}