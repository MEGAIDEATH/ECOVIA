import type { AccountStatus, UserRole } from '@/types';

/**
 * Non-blocking status banner for unapproved accounts. Never promises a date;
 * explains what is available now (own CV / facility profile, logout).
 */
export function PendingApprovalBanner({
  role,
  status,
  reason,
}: {
  role: UserRole;
  status: AccountStatus;
  reason: string | null;
}) {
  const subject = role === 'spec' ? 'سيرتك الذاتية' : 'ملف منشأتك';
  if (status === 'rejected') {
    return (
      <div role="status" className="alert alert-danger mb-6" data-testid="approval-banner">
        <span aria-hidden="true" className="material-symbols-outlined text-[22px]">
          report
        </span>
        <div>
          <p className="font-bold">لم يُعتمد الحساب بعد المراجعة.</p>
          {reason && <p className="mt-0.5">السبب: {reason}</p>}
          <p className="mt-0.5">يمكنك تحديث {subject} ثم التواصل مع إدارة إيكوفيا لإعادة المراجعة.</p>
        </div>
      </div>
    );
  }
  return (
    <div role="status" className="alert alert-info mb-6" data-testid="approval-banner">
      <span aria-hidden="true" className="material-symbols-outlined text-[22px]">
        pending_actions
      </span>
      <div>
        <p className="font-bold">حسابك قيد المراجعة من قبل الإدارة.</p>
        <p className="mt-0.5">
          يمكنك إكمال {subject} وتعديلها أثناء الانتظار. ستُتاح الطلبات والمراسلات والعقود بعد اعتماد الحساب.
        </p>
      </div>
    </div>
  );
}
