'use client';

import { LoadingButton } from '@/components/ui/LoadingButton';

import { useContactSpecialist } from './useContactSpecialist';

/** Opens (or resumes) the facility ↔ specialist chat. */
export function ContactSpecialistButton({ specialistUserId }: { specialistUserId: string }) {
  const { contact, contacting } = useContactSpecialist();
  return (
    <LoadingButton loading={contacting} loadingLabel="جاري..." onClick={() => void contact(specialistUserId)} className="btn btn-primary">
      <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
        chat
      </span>
      تواصل
    </LoadingButton>
  );
}
