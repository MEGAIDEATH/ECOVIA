'use client';

import { useState, type KeyboardEvent } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { adminLogin } from '@/features/admin/adminRepository';

interface AdminLoginPanelProps {
  onLoggedIn: () => void;
}

/** Inline admin login shown when visiting /admin without a session. */
export function AdminLoginPanel({ onLoggedIn }: AdminLoginPanelProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const submit = async () => {
    setLoading(true);
    try {
      await adminLogin(password);
      setPassword('');
      onLoggedIn();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'حدث خطأ في الاتصال';
      showToast(message, true);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">admin_panel_settings</span>{' '}
            دخول الإدارة
          </h3>
        </div>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onKeyDown={onKeyDown}
          aria-label="رمز الدخول"
          className="w-full px-4 py-3 bg-slate-50 rounded-xl border focus:border-primary mb-6 text-center text-xl tracking-widest outline-none"
          placeholder="****"
          dir="ltr"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-[#006d44] transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {loading && <Spinner className="w-4 h-4 border-2 border-white/70 border-t-white" />}
          دخول
        </button>
      </form>
    </main>
  );
}