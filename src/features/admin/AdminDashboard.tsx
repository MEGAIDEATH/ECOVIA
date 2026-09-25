'use client';

import { useCallback, useEffect, useState } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import {
  adminLogout,
  approveAccount,
  getAdminAccounts,
  isAdminAuthenticated,
  type AdminAccountCollection,
  type AdminAccounts,
} from '@/features/admin/adminRepository';
import { usePerformLogout } from '@/features/auth/usePerformLogout';

import { AdminLoginPanel } from './AdminLoginPanel';

type AdminTab = 'specialists' | 'organizations';

const ACTIVE_TAB =
  'flex items-center gap-2 w-full text-right px-4 py-3 rounded-xl bg-slate-800 text-white font-bold transition-colors';
const INACTIVE_TAB =
  'flex items-center gap-2 w-full text-right px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors';

/** Admin dashboard (legacy `view-admin`) — slate interface, approval tables. */
export function AdminDashboard() {
  const { showToast } = useToast();
  const performLogout = usePerformLogout();

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [accounts, setAccounts] = useState<AdminAccounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<AdminTab>('specialists');

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setAccounts(await getAdminAccounts());
    } catch (err) {
      console.error('[admin] load accounts failed:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.info('[ADMIN] AdminDashboard mounted');
    return () => {
      console.info('[ADMIN] AdminDashboard unmounted');
    };
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const ok = await isAdminAuthenticated();
      if (!active) return;
      setAuthed(ok);
      if (ok) await loadAccounts();
      else setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [loadAccounts]);

  const approve = async (collection: AdminAccountCollection, id: string) => {
    try {
      await approveAccount(collection, id);
      showToast('تم التحديث بنجاح');
      await loadAccounts();
    } catch (err) {
      console.error('[admin] approve failed:', err);
      const message = err instanceof Error ? err.message : 'حدث خطأ';
      showToast(message, true);
    }
  };

  const handleLogout = () => {
    void adminLogout().catch(() => undefined);
    performLogout();
  };

  // Only block the screen while the session is unknown. Once authenticated the
  // shell renders immediately and the table shows its own inline loading/error
  // state, so a slow accounts request can never hide the whole dashboard.
  if (authed === null) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Spinner className="w-12 h-12 border-4" />
      </div>
    );
  }

  if (!authed) {
    return (
      <AdminLoginPanel
        onLoggedIn={() => {
          setAuthed(true);
          void loadAccounts();
        }}
      />
    );
  }

  const rows = tab === 'specialists' ? accounts?.specialists ?? [] : accounts?.organizations ?? [];
  const nameKey = tab === 'specialists' ? 'الاسم' : 'اسم المنشأة';

  return (
    <main className="flex flex-col min-h-screen bg-surface">
      <header className="bg-slate-800 text-white p-6 rounded-b-3xl shadow-lg flex justify-between items-center sticky top-0 z-30">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-3xl">admin_panel_settings</span> بوابة
          الإدارة والتحكم
        </h1>
        <button
          type="button"
          onClick={handleLogout}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          aria-label="تسجيل خروج"
        >
          <span className="material-symbols-outlined text-white">power_settings_new</span>
        </button>
      </header>

      <div className="flex-1 flex p-6 gap-6 w-full max-w-7xl mx-auto flex-col md:flex-row">
        <div className="w-full md:w-64 bg-white rounded-2xl shadow-sm border p-4 h-fit flex flex-col gap-2">
          <button
            id="atab-spec"
            type="button"
            onClick={() => setTab('specialists')}
            className={tab === 'specialists' ? ACTIVE_TAB : INACTIVE_TAB}
          >
            <span className="material-symbols-outlined">group</span> اعتماد الأخصائيين
          </button>
          <button
            id="atab-org"
            type="button"
            onClick={() => setTab('organizations')}
            className={tab === 'organizations' ? ACTIVE_TAB : INACTIVE_TAB}
          >
            <span className="material-symbols-outlined">domain</span> اعتماد المنشآت
          </button>
        </div>

        <div className="flex-1 bg-white rounded-2xl shadow-sm border p-6 overflow-hidden">
          <div className="overflow-x-auto">
            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">
              {tab === 'specialists' ? 'جدول الأخصائيين المسجلين' : 'جدول المنشآت المسجلة'}
            </h2>
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 text-slate-600 border-b">
                <tr>
                  <th className="p-4 font-bold">{nameKey}</th>
                  <th className="p-4 font-bold">الحالة</th>
                  <th className="p-4 font-bold text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={3} className="p-4 text-center">
                      جاري...
                    </td>
                  </tr>
                )}
                {error && !loading && (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-red-500">
                      تعذر تحميل البيانات، حاول مرة أخرى.
                    </td>
                  </tr>
                )}
                {!loading && !error && rows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-slate-500">
                      لا توجد بيانات.
                    </td>
                  </tr>
                )}
                {!loading &&
                  !error &&
                  rows.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="p-4">{row.name || '-'}</td>
                      <td className="p-4">{row.status === 'approved' ? 'مفعل' : 'معلق'}</td>
                      <td className="p-4 text-center">
                        {row.status === 'pending' ? (
                          <button
                            type="button"
                            onClick={() => void approve(tab, row.id)}
                            className="bg-primary text-white px-2 py-1 rounded mx-1 hover:bg-[#006d44] transition-colors"
                          >
                            قبول
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}