import { LinkProfileStep } from '@/features/registration/LinkProfileStep';
import { registrationContext } from '@/features/registration/linking';
import { OtpVerification } from '@/features/registration/OtpVerification';

/** New visitors verify by OTP; a signed-in user confirms adding the profile to their login. */
export default async function VerifyPage() {
  const linking = await registrationContext('org');
  return linking ? <LinkProfileStep role="org" accountName={linking.accountName} /> : <OtpVerification role="org" />;
}
