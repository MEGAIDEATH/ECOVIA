'use client';

import { useCallback, useEffect, useState } from 'react';

import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { FullPageSpinner } from '@/components/layout/FullPageSpinner';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import {
  adminLogout,
  approveAccount,
  getAdminAccounts,
  isAdminAuthenticated,
  rejectAccount,
  type AdminAccountCollection,
  type AdminAccounts,
} from '@/features/admin/adminRepository';
import { usePerformLogout } from '@/features/auth/usePerformLogout';
import { ACCOUNT_STATUS, presentStatus } from '@/lib/status';

import { AdminLoginPanel } from './AdminLoginPanel';

type AdminTab = 'specialists' | 'organizations';

const TABS: ReadonlyArray<{ id: AdminTab; label: string; icon: string; domId: string }> = [
  { id: 'specialists', label: 'اعتماد الأخصائيين', icon: 'group', domId: 'atab-spec' },
  { id: 'organizations', label: 'اعتماد المنشآت', icon: 'domain', domId: 'atab-org' },
];

/** Admin dashboard — dense approval tables on the shared ECOVIA chrome. */
export function AdminDashboard() {
  const { showToast } = useToast();
  const performLogout = usePerformLogout();

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [accounts, setAccounts] = useState<AdminAccounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<AdminTab>('specialists');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

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
      showToast('تم اعتماد الحساب');
      await loadAccounts();
    } catch (err) {
      console.error('[admin] approve failed:', err);
      const message = err instanceof Error ? err.message : 'حدث خطأ';
      showToast(message, true);
    }
  };

  const reject = async (collection: AdminAccountCollection, id: string, reason: string) => {
    try {
      await rejectAccount(collection, id, reason);
      showToast('تم رفض الحساب');
      setRejectingId(null);
      setRejectReason('');
      await loadAccounts();
    } catch (err) {
      console.error('[admin] reject failed:', err);
      const message = err instanceof Error ? err.message : 'حدث خطأ';
      showToast(message, true);
    }
  };

  const closeReject = () => {
    setRejectingId(null);
    setRejectReason('');
  };

  const confirmReject = () => {
    if (!rejectingId) return;
    if (!rejectReason.trim()) {
      showToast('سبب الرفض مطلوب', true);
      return;
    }
    void reject(tab, rejectingId, rejectReason.trim());
  };

  const handleLogout = () => {
    void adminLogout().catch(() => undefined);
    performLogout();
  };

  // Only block the screen while the session is unknown. Once authenticated the
  // shell renders immediately and the table shows its own inline loading/error
  // state, so a slow accounts request can never hide the whole dashboard.
  if (authed === null) return <FullPageSpinner />;

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
  const pendingCount = (list: { status: string }[] | undefined) =>
    list?.filter((row) => row.status === 'pending').length ?? 0;
  const counts: Record<AdminTab, number> = {
    specialists: pendingCount(accounts?.specialists),
    organizations: pendingCount(accounts?.organizations),
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <DashboardHeader
        title="بوابة الإدارة والتحكم"
        subtitle="مراجعة واعتماد الحسابات"
        icon="admin_panel_settings"
        homeHref="/admin"
        onLogout={handleLogout}
      />

      <main className="container-brand flex flex-1 flex-col gap-6 py-8 md:flex-row md:py-10">
        <nav aria-label="أقسام الإدارة" className="card flex h-fit flex-row gap-1 p-2 md:w-64 md:flex-col">
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                id={item.domId}
                type="button"
                aria-pressed={active}
                onClick={() => setTab(item.id)}
                className={`flex flex-1 items-center gap-2 rounded-control px-3 py-2.5 text-start text-sm font-bold transition-colors md:flex-none ${
                  active ? 'bg-forest text-white' : 'text-on-surface-variant hover:bg-wash'
                }`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {counts[item.id] > 0 && (
                  <span
                    className={`badge ${active ? 'bg-white/20 text-white' : 'badge-warning'}`}
                    aria-label={`${counts[item.id]} بانتظار الاعتماد`}
                  >
                    {counts[item.id]}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <section className="card min-w-0 flex-1 overflow-hidden" aria-labelledby="admin-table-title">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <h2 id="admin-table-title" className="text-base font-bold text-forest">
              {tab === 'specialists' ? 'جدول الأخصائيين المسجلين' : 'جدول المنشآت المسجلة'}
            </h2>
            <button
              type="button"
              onClick={() => void loadAccounts()}
              disabled={loading}
              className="btn btn-ghost btn-sm"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                refresh
              </span>
              تحديث
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table min-w-[560px]">
              <thead>
                <tr>
                  <th scope="col">{nameKey}</th>
                  <th scope="col">الحالة</th>
                  <th scope="col" className="!text-center">
                    الإجراء
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={3} className="text-center text-muted">
                      جاري...
                    </td>
                  </tr>
                )}
                {error && !loading && (
                  <tr>
                    <td colSpan={3} className="text-center font-semibold text-danger">
                      تعذر تحميل البيانات، حاول مرة أخرى.
                    </td>
                  </tr>
                )}
                {!loading && !error && rows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-muted">
                      لا توجد بيانات.
                    </td>
                  </tr>
                )}
                {!loading &&
                  !error &&
                  rows.map((row) => {
                    const status = presentStatus(ACCOUNT_STATUS, row.status);
                    const docId =
                      ('licenseDocId' in row && row.licenseDocId) || ('crDocId' in row && row.crDocId) || null;
                    return (
                      <tr key={row.id}>
                        <td className="font-semibold text-on-surface">{row.name || '-'}</td>
                        <td>
                          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                        </td>
                        <td>
                          {row.status === 'pending' ? (
                            <div className="flex flex-wrap items-center justify-center gap-2">
                              {docId && (
                                <a
                                  href={`/api/files/${docId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-ghost btn-sm"
                                >
                                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                                    description
                                  </span>
                                  عرض المستند
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => void approve(tab, row.id)}
                                className="btn btn-primary btn-sm"
                              >
                                اعتماد
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectingId(row.id)}
                                className="btn btn-danger-outline btn-sm"
                              >
                                رفض
                              </button>
                            </div>
                          ) : (
                            <span className="block text-center text-muted">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <Modal open={rejectingId !== null} onClose={closeReject} title="رفض الحساب" icon="block" panelClassName="max-w-md">
        <Field id="reject-reason" label="سبب الرفض" required>
          <textarea
            id="reject-reason"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            className="field-input"
            rows={4}
            placeholder="سبب الرفض..."
          />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={closeReject} className="btn btn-secondary">
            إلغاء
          </button>
          <button type="button" onClick={confirmReject} className="btn btn-danger">
            تأكيد الرفض
          </button>
        </div>
      </Modal>
    </div>
  );
}
