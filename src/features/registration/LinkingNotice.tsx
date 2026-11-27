/**
 * Shown on the registration screens when the visitor is already signed in:
 * the new profile is attached to the SAME login (no new account), and it
 * starts pending until an administrator approves it.
 */
export function LinkingNotice({ accountName, role }: { accountName: string; role: 'spec' | 'org' }) {
  const kind = role === 'spec' ? 'حساب أخصائي' : 'حساب منشأة';
  return (
    <div role="note" className="alert alert-info" data-testid="linking-notice">
      <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
        person_add
      </span>
      <div>
        <p className="font-bold">سيُضاف {kind} إلى حسابك الحالي ({accountName}).</p>
        <p className="mt-0.5">
          لا حاجة لرمز تحقق جديد. يبقى الملف الجديد <strong>قيد المراجعة</strong> حتى تعتمده الإدارة بعد التحقق من
          {role === 'spec' ? ' الترخيص المهني' : ' السجل التجاري'}؛ أرفق المستند لتسريع المراجعة. حسابك الحالي لا يتأثر.
        </p>
      </div>
    </div>
  );
}
