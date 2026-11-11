'use client';

import { useState, type FormEvent } from 'react';

import { Field } from '@/components/ui/Field';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { useToast } from '@/components/ui/Toast';
import { adminLogin } from '@/features/admin/adminRepository';

interface AdminLoginFormProps {
  onSuccess: () => void;
  autoFocus?: boolean;
}

/**
 * Admin email + password form shared by the landing-page modal and the
 * `/admin` login panel. Credentials are validated server-side by
 * /api/admin/login (password hash + database role) — never in browser JS.
 */
export function AdminLoginForm({ onSuccess, autoFocus = false }: AdminLoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await adminLogin(email.trim(), password);
      setPassword('');
      onSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'حدث خطأ في الاتصال';
      showToast(message, true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4" noValidate>
      <Field id="admin-email" label="البريد الإلكتروني">
        <input
          id="admin-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="field-input text-left"
          placeholder="admin@example.com"
          dir="ltr"
          autoComplete="email"
          autoFocus={autoFocus}
        />
      </Field>
      <Field id="admin-password" label="رمز الدخول">
        <input
          id="admin-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="field-input text-left tracking-widest"
          placeholder="••••"
          dir="ltr"
          autoComplete="current-password"
        />
      </Field>
      <LoadingButton type="submit" loading={loading} showSpinner loadingLabel="جاري..." className="btn btn-primary btn-block">
        دخول
      </LoadingButton>
    </form>
  );
}
