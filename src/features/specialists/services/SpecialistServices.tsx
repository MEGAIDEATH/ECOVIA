'use client';

import Link from 'next/link';

import { ErrorState, LoadingState } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { ServiceRequestList } from '@/features/service-requests/ServiceRequestViews';
import { useServiceRequests } from '@/features/service-requests/useServiceRequests';
import { useSpecialistDashboard } from '@/features/specialists/dashboard/SpecialistDashboardProvider';
import { ONGOING_STATUSES } from '@/lib/serviceRequests';

/**
 * الخدمات — the specialist's service engagements: general requests they took,
 * split into ongoing and completed. (Formerly "المشاريع".)
 */
export function SpecialistServices() {
  const state = useServiceRequests();
  const { specialist } = useSpecialistDashboard();
  const mine = state.status === 'ready' && specialist ? state.data.filter((r) => r.specialistId === specialist.id) : [];
  const ongoing = mine.filter((r) => ONGOING_STATUSES.includes(r.status));
  const finished = mine.filter((r) => !ONGOING_STATUSES.includes(r.status));

  return (
    <div className="fade-up space-y-8">
      <PageHeader
        title="الخدمات"
        description="الخدمات التي قبلتها من طلبات المنشآت، وحالة تنفيذ كل منها."
        actions={
          <Link href="/specialist/requests" className="btn btn-secondary">
            تصفح طلبات الخدمة العامة
          </Link>
        }
      />
      {state.status === 'loading' && <LoadingState />}
      {state.status === 'error' && <ErrorState message="تعذر تحميل الخدمات، حاول مرة أخرى." />}
      {state.status === 'ready' && (
        <>
          <section aria-labelledby="services-ongoing" className="space-y-3">
            <h3 id="services-ongoing" className="font-bold text-forest">
              الخدمات الجارية <span className="badge badge-neutral ms-1">{ongoing.length}</span>
            </h3>
            <ServiceRequestList requests={ongoing} hrefBase="/specialist/requests" empty="لا توجد خدمات جارية. اقبل طلبًا لتبدأ." />
          </section>
          <section aria-labelledby="services-finished" className="space-y-3">
            <h3 id="services-finished" className="font-bold text-forest">
              الخدمات السابقة <span className="badge badge-neutral ms-1">{finished.length}</span>
            </h3>
            <ServiceRequestList requests={finished} hrefBase="/specialist/requests" empty="لا توجد خدمات سابقة." />
          </section>
        </>
      )}
    </div>
  );
}
