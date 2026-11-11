'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';

import { AuthShell } from '@/components/layout/AuthShell';
import { Field } from '@/components/ui/Field';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { useAuth } from '@/features/auth/AuthProvider';
import { useToast } from '@/components/ui/Toast';

export default function SetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useAuth();
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const next = params.get('next') || '/';

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: password, confirmPassword: confirm }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        showToast(data?.error ?? 'تعذر إعداد كلمة المرور.', true);
        return;
      }
      await refresh();
      showToast('تم إعداد كلمة المرور بنجاح.');
      router.push(next);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="إعداد كلمة المرور"
      subtitle="أدخل كلمة مرور جديدة لحسابك. يجب أن تكون 8 أحرف على الأقل."
      icon="password"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field id="password" label="كلمة المرور الجديدة" required>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field-input"
            minLength={8}
            autoComplete="new-password"
            required
          />
        </Field>
        <Field id="confirm" label="تأكيد كلمة المرور" required>
          <input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="field-input"
            minLength={8}
            autoComplete="new-password"
            required
          />
        </Field>
        <LoadingButton type="submit" loading={submitting} loadingLabel="جاري الحفظ..." showSpinner className="btn btn-primary btn-block btn-lg">
          حفظ كلمة المرور
        </LoadingButton>
      </form>
    </AuthShell>
  );
}
