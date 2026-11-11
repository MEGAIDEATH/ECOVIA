'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';

import { AuthShell } from '@/components/layout/AuthShell';
import { Field } from '@/components/ui/Field';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { useAuth } from '@/features/auth/AuthProvider';
import { useDashboardEntry } from '@/features/auth/useDashboardEntry';
import { safeRedirectPath } from '@/lib/utils/url';
import { useToast } from '@/components/ui/Toast';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, refresh } = useAuth();
  const { checkAndGoToDashboard } = useDashboardEntry();
  const { showToast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const requestedDestination = useCallback((): string | null => {
    const candidates = [
      searchParams.get('next'),
      searchParams.get('returnTo'),
      searchParams.get('callbackUrl'),
      searchParams.get('redirect'),
      searchParams.get('redirectUrl'),
    ];
    for (const candidate of candidates) {
      const safe = safeRedirectPath(candidate);
      if (safe) return safe;
    }
    return null;
  }, [searchParams]);

  // An already-authenticated visitor must not be forced through login again.
  useEffect(() => {
    if (loading || !user) return;
    const destination = requestedDestination();
    if (destination && destination !== '/login') {
      router.replace(destination);
      return;
    }
    void checkAndGoToDashboard(user);
  }, [loading, user, router, checkAndGoToDashboard, requestedDestination]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        showToast(data?.error ?? 'بيانات الدخول غير صحيحة.', true);
        return;
      }
      const sessionUser = await refresh();
      const destination = requestedDestination();
      if (destination && destination !== '/login') {
        router.replace(destination);
        return;
      }
      await checkAndGoToDashboard(sessionUser);
    } finally {
      setSubmitting(false);
    }
  }

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
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field id="identifier" label="البريد الإلكتروني أو رقم الجوال">
          <input
            id="identifier"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="field-input"
            autoComplete="username"
            required
          />
        </Field>
        <Field id="password" label="كلمة المرور">
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field-input pl-20"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
              aria-controls="password"
              className="btn btn-ghost btn-sm absolute top-1/2 left-1.5 -translate-y-1/2"
            >
              {showPassword ? 'إخفاء' : 'إظهار'}
            </button>
          </div>
        </Field>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm font-semibold text-secondary hover:text-primary">
            نسيت كلمة المرور؟
          </Link>
        </div>
        <LoadingButton type="submit" loading={submitting} loadingLabel="جاري الدخول..." showSpinner className="btn btn-primary btn-block btn-lg">
          دخول
        </LoadingButton>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
