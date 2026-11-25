import { LinkingNotice } from '@/features/registration/LinkingNotice';
import { registrationContext } from '@/features/registration/linking';
import { SpecialistRegistrationConsolidated } from '@/features/registration/SpecialistRegistrationConsolidated';

export default async function SpecialistRegistrationPage() {
  const linking = await registrationContext('spec');
  return (
    <SpecialistRegistrationConsolidated
      notice={linking ? <LinkingNotice accountName={linking.accountName} role="spec" /> : undefined}
    />
  );
}
