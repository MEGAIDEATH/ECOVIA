'use client';

import { Suspense } from 'react';

import { ErrorState, LoadingState } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { RequestCategoryTabs } from '@/features/service-requests/ServiceRequestViews';
import { useServiceRequests } from '@/features/service-requests/useServiceRequests';

export function SpecialistRequests() {
  const state = useServiceRequests();

  return (
    <div className="fade-up">
      <PageHeader
        title="طلبات الخدمة العامة"
        description="طلبات تنشرها المنشآت. اطّلع على التكلفة والمدة والمنطقة، ثم افتح الطلب لقبوله أو الاعتذار عنه."
      />
      {state.status === 'loading' && <LoadingState />}
      {state.status === 'error' && <ErrorState message="تعذر تحميل الطلبات، حاول مرة أخرى." />}
      {state.status === 'ready' && (
        <Suspense fallback={<LoadingState />}>
          <RequestCategoryTabs requests={state.data} hrefBase="/specialist/requests" />
        </Suspense>
      )}
    </div>
  );
}
