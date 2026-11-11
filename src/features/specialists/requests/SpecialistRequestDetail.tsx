'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Feedback';
import { Field } from '@/components/ui/Field';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { ServiceRequestDetails } from '@/features/service-requests/ServiceRequestViews';
import { useRequestAction } from '@/features/service-requests/useRequestAction';
import { useServiceRequest } from '@/features/service-requests/useServiceRequests';
import { useSpecialistDashboard } from '@/features/specialists/dashboard/SpecialistDashboardProvider';

type Confirm = 'accept' | 'decline' | null;

export function SpecialistRequestDetail() {
  const params = useParams<{ id: string }>();
  const { state, replace } = useServiceRequest(params?.id);
  const { run, busy } = useRequestAction(replace);
  const { showToast } = useToast();
  const { specialist } = useSpecialistDashboard();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [reason, setReason] = useState('');

  const request = state.status === 'ready' ? state.data : null;
  const isMine = Boolean(request && specialist && request.specialistId === specialist.id);
  const canRespond = request?.status === 'pending' && !request.declinedByMe;

  const confirmAction = async () => {
    if (!request || !confirm) return;
    if (confirm === 'decline' && !reason.trim()) {
      showToast('سبب الاعتذار مطلوب', true);
      return;
    }
    const ok =
      confirm === 'accept'
        ? await run(request.id, 'accept', undefined, 'تم قبول الطلب وفتح قناة تواصل مع المنشأة')
        : await run(request.id, 'reject', { reason: reason.trim() }, 'تم الاعتذار عن الطلب');
    if (ok) setConfirm(null);
  };

  return (
    <div className="fade-up space-y-5">
      <PageHeader title="تفاصيل طلب الخدمة العامة" back={{ href: '/specialist/requests', label: 'طلبات الخدمة العامة' }} />
      {state.status === 'loading' && <LoadingState />}
      {state.status === 'error' && <ErrorState message="تعذر تحميل الطلب، حاول مرة أخرى." />}
      {state.status === 'ready' && !request && (
        <div className="card">
          <EmptyState message="الطلب غير موجود أو لم يعد متاحًا." />
        </div>
      )}
      {request && (
        <>
          <ServiceRequestDetails request={request} />

          {request.declinedByMe && request.status === 'pending' && (
            <div role="status" className="alert alert-info">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">info</span>
              <p>اعتذرت عن هذا الطلب، وما زال متاحًا لبقية الأخصائيين. يمكنك قبوله إن غيّرت رأيك.</p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {request.status === 'pending' && (
              <button type="button" onClick={() => setConfirm('accept')} disabled={busy} className="btn btn-primary">
                قبول الطلب
              </button>
            )}
            {canRespond && (
              <button type="button" onClick={() => setConfirm('decline')} disabled={busy} className="btn btn-secondary">
                اعتذار
              </button>
            )}
            {isMine && request.status === 'accepted' && (
              <LoadingButton
                loading={busy}
                loadingLabel="جاري التحديث..."
                onClick={() => void run(request.id, 'status', { status: 'in_progress' }, 'بدأ تنفيذ الخدمة')}
                className="btn btn-primary"
              >
                بدء تنفيذ الخدمة
              </LoadingButton>
            )}
            {isMine && request.status === 'in_progress' && (
              <LoadingButton
                loading={busy}
                loadingLabel="جاري التحديث..."
                onClick={() => void run(request.id, 'status', { status: 'completed' }, 'تم إنهاء الخدمة')}
                className="btn btn-primary"
              >
                إنهاء الخدمة
              </LoadingButton>
            )}
            {isMine && request.conversationId && (
              <Link href="/specialist/messages" className="btn btn-secondary">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">forum</span>
                المراسلات
              </Link>
            )}
          </div>
        </>
      )}

      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === 'decline' ? 'الاعتذار عن الطلب' : 'تأكيد القبول'}
        icon={confirm === 'decline' ? 'do_not_disturb_on' : 'task_alt'}
        panelClassName="max-w-md"
      >
        <p className="mb-4 text-[15px] text-on-surface">
          {confirm === 'accept'
            ? 'بقبول الطلب تصبح الأخصائي المنفّذ له، ويُغلق أمام بقية الأخصائيين. هل تريد المتابعة؟'
            : 'سيُخفى الطلب من طلباتك المعلقة ويبقى متاحًا لبقية الأخصائيين.'}
        </p>
        {confirm === 'decline' && (
          <Field id="decline-reason" label="سبب الاعتذار" required className="mb-4">
            <textarea
              id="decline-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="field-input"
              rows={3}
              maxLength={1000}
              placeholder="مثال: خارج نطاق تخصصي"
            />
          </Field>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setConfirm(null)} className="btn btn-secondary">
            إلغاء
          </button>
          <LoadingButton
            loading={busy}
            loadingLabel="جاري المعالجة..."
            onClick={() => void confirmAction()}
            className={`btn ${confirm === 'accept' ? 'btn-primary' : 'btn-danger-outline'}`}
          >
            تأكيد
          </LoadingButton>
        </div>
      </Modal>
    </div>
  );
}
