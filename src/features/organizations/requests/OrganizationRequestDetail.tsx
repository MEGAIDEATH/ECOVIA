'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Feedback';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { ServiceRequestDetails } from '@/features/service-requests/ServiceRequestViews';
import { useRequestAction } from '@/features/service-requests/useRequestAction';
import { useServiceRequest } from '@/features/service-requests/useServiceRequests';

export function OrganizationRequestDetail() {
  const params = useParams<{ id: string }>();
  const { state, replace } = useServiceRequest(params?.id);
  const { run, busy } = useRequestAction(replace);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const request = state.status === 'ready' ? state.data : null;

  return (
    <div className="fade-up space-y-5">
      <PageHeader title="تفاصيل طلب الخدمة العامة" back={{ href: '/organization/requests', label: 'طلبات الخدمة العامة' }} />
      {state.status === 'loading' && <LoadingState />}
      {state.status === 'error' && <ErrorState message="تعذر تحميل الطلب، حاول مرة أخرى." />}
      {state.status === 'ready' && !request && (
        <div className="card">
          <EmptyState message="الطلب غير موجود." />
        </div>
      )}
      {request && (
        <>
          <ServiceRequestDetails request={request} />
          <div className="flex flex-wrap gap-3">
            {request.specialistId && (
              <Link href={`/organization/specialists/${request.specialistId}`} className="btn btn-secondary">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">person</span>
                ملف الأخصائي
              </Link>
            )}
            {request.conversationId && (
              <Link href="/organization/messages" className="btn btn-secondary">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">forum</span>
                المراسلات
              </Link>
            )}
            {request.status === 'pending' && (
              <button type="button" onClick={() => setConfirmCancel(true)} className="btn btn-danger-outline">
                إلغاء الطلب
              </button>
            )}
          </div>
        </>
      )}

      <Modal open={confirmCancel} onClose={() => setConfirmCancel(false)} title="إلغاء الطلب" icon="block" panelClassName="max-w-md">
        <p className="mb-5 text-[15px]">سيُسحب الطلب من قائمة الأخصائيين وينتقل إلى الطلبات السابقة. هل تريد المتابعة؟</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setConfirmCancel(false)} className="btn btn-secondary">
            تراجع
          </button>
          <LoadingButton
            loading={busy}
            loadingLabel="جاري الإلغاء..."
            onClick={async () => {
              if (request && (await run(request.id, 'cancel', undefined, 'تم إلغاء الطلب'))) setConfirmCancel(false);
            }}
            className="btn btn-danger"
          >
            تأكيد الإلغاء
          </LoadingButton>
        </div>
      </Modal>
    </div>
  );
}
