'use client';

import { useEffect, useState } from 'react';

import { DocumentViewer } from '@/components/ui/DocumentViewer';
import { ErrorState, LoadingState } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Modal';
import { formatDateTimeAr } from '@/lib/format';

import { getAccountDetails, type AdminAccountCollection, type AdminAccountDetails } from './adminRepository';

const ACTIONS: Record<string, string> = {
  'account.registered': 'تسجيل الحساب',
  'account.approved': 'اعتماد',
  'account.rejected': 'رفض',
  'account.reopened': 'إعادة فتح المراجعة (الإدارة)',
  'account.resubmitted': 'إعادة إرسال من صاحب الحساب',
};

const SPEC_FIELDS: Array<[string, string]> = [
  ['fullName', 'الاسم'],
  ['nationalId', 'رقم الهوية'],
  ['phone', 'الجوال'],
  ['email', 'البريد'],
  ['license', 'رقم الترخيص'],
  ['issueDate', 'تاريخ الإصدار'],
  ['region', 'المنطقة'],
  ['edu', 'التخصص'],
];
const ORG_FIELDS: Array<[string, string]> = [
  ['orgName', 'اسم المنشأة'],
  ['crNumber', 'السجل التجاري'],
  ['phone', 'رقم التواصل'],
  ['orgDesc', 'النبذة'],
  ['website', 'الموقع'],
];

/** Admin review panel: registration record, attachments and the full review history. */
export function AdminAccountDetails({
  target,
  id,
  onClose,
}: {
  target: AdminAccountCollection;
  id: string;
  onClose: () => void;
}) {
  const [state, setState] = useState<{ status: 'loading' } | { status: 'error' } | { status: 'ready'; data: AdminAccountDetails }>({
    status: 'loading',
  });
  const [openDoc, setOpenDoc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getAccountDetails(target, id)
      .then((data) => active && setState({ status: 'ready', data }))
      .catch(() => active && setState({ status: 'error' }));
    return () => {
      active = false;
    };
  }, [target, id]);

  const fields = target === 'specialists' ? SPEC_FIELDS : ORG_FIELDS;

  return (
    <Modal open onClose={onClose} title="تفاصيل الحساب وسجل المراجعة" icon="manage_search" panelClassName="max-w-2xl">
      <div className="space-y-5 overflow-y-auto pe-1">
        {state.status === 'loading' && <LoadingState />}
        {state.status === 'error' && <ErrorState message="تعذر تحميل تفاصيل الحساب." />}
        {state.status === 'ready' && (
          <>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {fields.map(([key, label]) => (
                <div key={key}>
                  <dt className="text-xs font-bold text-muted">{label}</dt>
                  <dd className="text-sm whitespace-pre-wrap">{String(state.data.profile[key] ?? '-') || '-'}</dd>
                </div>
              ))}
            </dl>
            {state.data.profile.rejectionReason && (
              <p className="alert alert-danger">آخر سبب رفض: {state.data.profile.rejectionReason}</p>
            )}
            <section>
              <h4 className="mb-2 text-sm font-bold text-forest">المرفقات</h4>
              {state.data.attachments.length === 0 ? (
                <p className="text-sm text-muted">لا توجد مرفقات.</p>
              ) : (
                <ul className="space-y-2">
                  {state.data.attachments.map((doc) => (
                    <li key={doc.id} className="rounded-control border border-line p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold">
                          {doc.label} <span className="text-xs font-normal text-muted">· {formatDateTimeAr(doc.createdAt)}</span>
                        </span>
                        <button type="button" onClick={() => setOpenDoc(openDoc === doc.id ? null : doc.id)} className="btn btn-ghost btn-sm">
                          {openDoc === doc.id ? 'إخفاء' : 'عرض'}
                        </button>
                      </div>
                      {openDoc === doc.id && (
                        <div className="mt-2">
                          <DocumentViewer src={`/api/files/${doc.id}`} title={doc.label} />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <h4 className="mb-2 text-sm font-bold text-forest">سجل المراجعة</h4>
              {state.data.history.length === 0 ? (
                <p className="text-sm text-muted">لا توجد أحداث مسجلة.</p>
              ) : (
                <ol className="space-y-2 border-s-2 border-line ps-4" data-testid="review-history">
                  {state.data.history.map((event, index) => (
                    <li key={index} className="text-sm">
                      <span className="font-bold">{ACTIONS[event.action] ?? event.action}</span>
                      <span className="text-xs text-muted"> · {formatDateTimeAr(event.createdAt)}</span>
                      {event.detail && <p className="text-muted">{event.detail}</p>}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </>
        )}
      </div>
    </Modal>
  );
}
