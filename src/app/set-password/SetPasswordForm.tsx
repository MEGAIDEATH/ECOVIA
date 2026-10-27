 

import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';

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
    <main className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-2xl border bg-white p-6 shadow">
        <h1 className="text-xl font-bold text-on-surface">إعداد كلمة المرور</h1>
        <p className="text-sm text-secondary">
          أدخل كلمة مرور جديدة لحسابك. يجب أن تكون 8 أحرف على الأقل.
        </p>
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-bold">
            كلمة المرور الجديدة
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border px-4 py-3"
            minLength={8}
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="confirm" className="block text-sm font-bold">
            تأكيد كلمة المرور
          </label>
          <input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-xl border px-4 py-3"
            minLength={8}
            required
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-primary py-3 font-bold text-white disabled:opacity-60"
        >
          {submitting ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
        </button>
      </form>
    </main>
  );
}
