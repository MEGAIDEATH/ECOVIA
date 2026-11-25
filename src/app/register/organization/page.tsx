import { LinkingNotice } from '@/features/registration/LinkingNotice';
import { registrationContext } from '@/features/registration/linking';
import { OrganizationRegistrationForm } from '@/features/registration/OrganizationRegistrationForm';

export default async function OrganizationRegisterPage() {
  const linking = await registrationContext('org');
  return (
    <OrganizationRegistrationForm
      linking={Boolean(linking)}
      notice={linking ? <LinkingNotice accountName={linking.accountName} role="org" /> : undefined}
    />
  );
}
