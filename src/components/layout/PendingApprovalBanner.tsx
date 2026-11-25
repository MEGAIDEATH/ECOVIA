import { ActionForm } from '@/components/ui/ActionForm';
import { resubmitForReviewAction } from '@/server/actions/profile';
import type { AccountStatus, UserRole } from '@/types';

/**
 * Non-blocking status banner for unapproved accounts. Never promises a date;
 * explains what is available now (own CV / facility profile, logout). A
 * rejected account can resubmit for review once it has corrected its data.
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
      <div role="status" className="alert alert-danger mb-6 flex-col gap-3 sm:flex-row" data-testid="approval-banner">
        <span aria-hidden="true" className="material-symbols-outlined text-[22px]">
          report
        </span>
        <div className="flex-1">
          <p className="font-bold">لم يُعتمد الحساب بعد المراجعة.</p>
          {reason && <p className="mt-0.5">السبب: {reason}</p>}
          <p className="mt-0.5">صحّح {subject} وفق السبب، ثم أعد إرسال الحساب للمراجعة.</p>
        </div>
        <ActionForm
          action={resubmitForReviewAction}
          hidden={{ role }}
          label="إعادة الإرسال للمراجعة"
          buttonClassName="btn btn-secondary btn-sm"
          confirm={{
            title: 'إعادة الإرسال للمراجعة',
            body: 'سيعود الحساب إلى قائمة المراجعة لدى الإدارة. يبقى الرفض السابق محفوظاً في سجل المراجعة.',
            confirmLabel: 'إعادة الإرسال',
            icon: 'send',
          }}
        >
          <label htmlFor="resubmit-note" className="field-label">
            ملاحظة للإدارة (اختياري)
          </label>
          <textarea id="resubmit-note" name="note" rows={3} maxLength={500} className="field-input" />
        </ActionForm>
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
        {reason && <p className="mt-0.5">أُعيد إرسال الحساب بعد رفض سابق (السبب: {reason}).</p>}
      </div>
    </div>
  );
}
