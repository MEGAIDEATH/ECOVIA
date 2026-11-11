'use client';

import Link from 'next/link';
import { Suspense } from 'react';

import { ErrorState, LoadingState } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { RequestCategoryTabs } from '@/features/service-requests/ServiceRequestViews';
import { useServiceRequests } from '@/features/service-requests/useServiceRequests';

export function OrganizationRequests() {
  const state = useServiceRequests();

  return (
    <div className="fade-up">
      <PageHeader
        title="طلبات الخدمة العامة"
        description="الطلبات التي نشرتها منشأتك ليطّلع عليها الأخصائيون المعتمدون ويستجيبوا لها."
        actions={
          <Link href="/organization/requests/new" className="btn btn-primary">
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">add</span>
            نشر طلب خدمة عامة
          </Link>
        }
      />
      {state.status === 'loading' && <LoadingState />}
      {state.status === 'error' && <ErrorState message="تعذر تحميل الطلبات، حاول مرة أخرى." />}
      {state.status === 'ready' && (
        <Suspense fallback={<LoadingState />}>
          <RequestCategoryTabs
            requests={state.data}
            hrefBase="/organization/requests"
            emptyAction={
              <Link href="/organization/requests/new" className="btn btn-soft btn-sm">
                انشر طلبك الأول
              </Link>
            }
          />
        </Suspense>
      )}
    </div>
  );
}
