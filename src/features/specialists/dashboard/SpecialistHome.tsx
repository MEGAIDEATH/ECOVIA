'use client';

import Link from 'next/link';

import { ErrorState, LoadingState } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { RequestStatusBadge } from '@/features/service-requests/ServiceRequestViews';
import { useServiceRequests } from '@/features/service-requests/useServiceRequests';
import { ONGOING_STATUSES, categorizeRequest, formatCost } from '@/lib/serviceRequests';
import type { StatusTone } from '@/lib/status';
import type { ServiceRequest } from '@/types';

import { useSpecialistDashboard } from './SpecialistDashboardProvider';

const TILE_TONE: Record<StatusTone, string> = {
  brand: 'bg-accent-soft text-secondary',
  warning: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-info',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-surface-container-low text-on-surface-variant',
};

function RequestRow({ request }: { request: ServiceRequest }) {
  return (
    <Link
      href={`/specialist/requests/${request.id}`}
      className="flex items-center justify-between gap-3 rounded-control bg-wash px-3 py-2.5 text-sm no-underline hover:bg-accent-soft"
    >
      <span className="min-w-0">
        <span className="block truncate font-semibold text-on-surface">{request.serviceName}</span>
        <span className="block truncate text-xs text-muted">
          {formatCost(request.cost)} · {request.duration} · {request.region}
        </span>
      </span>
      <RequestStatusBadge request={request} />
    </Link>
  );
}

export function SpecialistHome() {
  const state = useServiceRequests();
  const { specialist } = useSpecialistDashboard();
  const all = state.status === 'ready' ? state.data : [];
  const open = all.filter((r) => categorizeRequest(r) === 'pending');
  const mine = specialist ? all.filter((r) => r.specialistId === specialist.id) : [];
  const ongoing = mine.filter((r) => ONGOING_STATUSES.includes(r.status));
  const completed = mine.filter((r) => r.status === 'completed');
  const count = (n: number) => (state.status === 'loading' ? '…' : n);

  const metrics: Array<{ icon: string; value: string | number; label: string; tone: StatusTone }> = [
    { icon: 'mark_email_unread', value: count(open.length), label: 'طلبات جديدة', tone: 'warning' },
    { icon: 'work_history', value: count(ongoing.length), label: 'خدمات قيد التنفيذ', tone: 'brand' },
    { icon: 'task_alt', value: count(completed.length), label: 'خدمات مكتملة', tone: 'info' },
    { icon: 'verified', value: 'معتمد', label: 'حالة الحساب', tone: 'success' },
  ];

  return (
    <div className="fade-up space-y-6">
      <PageHeader title="نظرة عامة" description="ملخص نشاطك على إيكوفيا." />

      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {metrics.map((metric) => (
          <li key={metric.label} className="card flex min-h-28 items-center gap-3 p-4 md:p-5">
            <span className={`grid size-11 shrink-0 place-items-center rounded-[14px] ${TILE_TONE[metric.tone]}`}>
              <span aria-hidden="true" className="material-symbols-outlined text-[24px]">{metric.icon}</span>
            </span>
            <div className="min-w-0">
              <p className="text-xl leading-tight font-bold text-forest">{metric.value}</p>
              <p className="truncate text-xs font-semibold text-muted">{metric.label}</p>
            </div>
          </li>
        ))}
      </ul>

      {state.status === 'error' && <ErrorState message="تعذر تحميل الطلبات." />}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="card p-5" aria-labelledby="latest-requests">
          <div className="mb-4 flex items-center justify-between">
            <h3 id="latest-requests" className="flex items-center gap-2 font-bold text-forest">
              <span aria-hidden="true" className="material-symbols-outlined text-secondary">notifications_active</span>
              أحدث طلبات الخدمة العامة
            </h3>
            <Link href="/specialist/requests" className="btn btn-soft btn-sm">
              عرض الكل
            </Link>
          </div>
          {state.status === 'loading' && <LoadingState />}
          {state.status === 'ready' && open.length === 0 && (
            <p className="py-10 text-center text-sm text-muted">لا توجد طلبات جديدة حالياً.</p>
          )}
          {open.length > 0 && (
            <ul className="space-y-2">
              {open.slice(0, 3).map((request) => (
                <li key={request.id}>
                  <RequestRow request={request} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5" aria-labelledby="active-services">
          <div className="mb-4 flex items-center justify-between">
            <h3 id="active-services" className="flex items-center gap-2 font-bold text-forest">
              <span aria-hidden="true" className="material-symbols-outlined text-secondary">rocket_launch</span>
              الخدمات الجارية
            </h3>
            <Link href="/specialist/services" className="btn btn-soft btn-sm">
              الخدمات
            </Link>
          </div>
          {state.status === 'loading' && <LoadingState />}
          {state.status === 'ready' && ongoing.length === 0 && (
            <p className="py-10 text-center text-sm text-muted">لا توجد خدمات قيد التنفيذ. اقبل أحد الطلبات لتبدأ!</p>
          )}
          {ongoing.length > 0 && (
            <ul className="space-y-2">
              {ongoing.map((request) => (
                <li key={request.id}>
                  <RequestRow request={request} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
