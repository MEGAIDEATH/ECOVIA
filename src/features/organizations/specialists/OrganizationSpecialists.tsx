'use client';

import { useRouter } from 'next/navigation';

import type { PublicSpecialistSummary } from '@/types';

import { SpecialistDirectory } from './SpecialistDirectory';
import { useContactSpecialist } from './useContactSpecialist';

/** Organization tab: specialist directory → profile page, direct contact, or a private request. */
export function OrganizationSpecialists({ specialists }: { specialists: PublicSpecialistSummary[] }) {
  const router = useRouter();
  const { contact } = useContactSpecialist();

  return (
    <SpecialistDirectory
      specialists={specialists}
      onViewCv={(summary) => router.push(`/organization/specialists/${summary.id}`)}
      onContact={(summary) => void contact(summary.userId)}
      onPrivateRequest={(summary) => router.push(`/organization/requests/new?specialist=${summary.id}`)}
    />
  );
}
