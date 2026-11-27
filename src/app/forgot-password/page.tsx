import type { Metadata } from 'next';

import { ForgotPasswordForm } from '@/features/auth/ForgotPasswordForm';

export const metadata: Metadata = { title: 'استعادة كلمة المرور' };

/** Server page; the multi-step OTP reset form is the only client part. */
export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
