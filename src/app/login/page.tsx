 

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';

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
    <main className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-2xl border bg-white p-6 shadow">
        <h1 className="text-xl font-bold text-on-surface">تسجيل الدخول</h1>
        <div className="space-y-2">
          <label htmlFor="identifier" className="block text-sm font-bold">
            البريد الإلكتروني أو رقم الجوال
          </label>
          <input
            id="identifier"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full rounded-xl border px-4 py-3"
            autoComplete="username"
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-bold">
            كلمة المرور
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border px-4 py-3"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-secondary"
            >
              {showPassword ? 'إخفاء' : 'إظهار'}
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-primary py-3 font-bold text-white disabled:opacity-60"
        >
          {submitting ? 'جاري الدخول...' : 'دخول'}
        </button>
        <div className="text-center">
          <a href="/forgot-password" className="text-sm text-primary underline">
            نسيت كلمة المرور؟
          </a>
        </div>
      </form>
    </main>
  );
}
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
