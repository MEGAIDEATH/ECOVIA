'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Field } from '@/components/ui/Field';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { useToast } from '@/components/ui/Toast';

/**
 * Email/phone + password sign-in. On success the server decides the
 * destination: `/dashboard` resolves approved accounts to their workspace and
 * pending ones to their own CV / facility profile. `next` is pre-validated by
 * the server page (same-origin paths only).
 */
export function LoginForm({ next }: { next: string | null }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
      router.replace(next ?? '/dashboard');
      router.refresh();
    } catch {
      showToast('تعذر الاتصال بالخادم، حاول مرة أخرى.', true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
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
  );
}
