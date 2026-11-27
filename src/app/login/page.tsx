import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AuthShell } from '@/components/layout/AuthShell';
import { LoginForm } from '@/features/auth/LoginForm';
import { getCurrentAccount } from '@/lib/auth/policies';
import type { SearchParams } from '@/lib/searchParams';
import { safeRedirectPath } from '@/lib/utils/url';

export const metadata: Metadata = { title: 'تسجيل الدخول' };

const NEXT_PARAMS = ['next', 'returnTo', 'callbackUrl', 'redirect', 'redirectUrl'] as const;

function requestedDestination(params: Record<string, string | string[] | undefined>): string | null {
  for (const key of NEXT_PARAMS) {
    const value = params[key];
    const safe = safeRedirectPath(Array.isArray(value) ? value[0] : value);
    if (safe && safe !== '/login') return safe;
  }
  return null;
}

/** Already signed in → straight to the destination (no second login). */
export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const next = requestedDestination(await searchParams);
  if (await getCurrentAccount()) redirect(next ?? '/dashboard');

  return (
    <AuthShell
      title="تسجيل الدخول"
      subtitle="مرحبًا بعودتك إلى إيكوفيا."
      footer={
        <>
          ليس لديك حساب؟{' '}
          <Link href="/choose-role" className="font-bold text-secondary hover:text-primary">
            إنشاء حساب
          </Link>
        </>
      }
    >
      <LoginForm next={next} />
    </AuthShell>
  );
}
