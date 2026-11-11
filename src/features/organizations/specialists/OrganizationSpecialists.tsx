'use client';

import { useRouter } from 'next/navigation';

import { SpecialistDirectory } from './SpecialistDirectory';
import { useContactSpecialist } from './useContactSpecialist';

/** Organization tab: specialist directory → profile page or direct contact. */
export function OrganizationSpecialists() {
  const router = useRouter();
  const { contact } = useContactSpecialist();

  return (
    <SpecialistDirectory
      onViewCv={(summary) => router.push(`/organization/specialists/${summary.id}`)}
      onContact={(summary) => void contact(summary.userId)}
    />
  );
}
