'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ErrorState, LoadingState } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { ServiceRequestList, formatDate } from '@/features/service-requests/ServiceRequestViews';
import { useServiceRequests } from '@/features/service-requests/useServiceRequests';
import { ONGOING_STATUSES } from '@/lib/serviceRequests';
import { SERVICE_REQUEST_STATUS, presentStatus } from '@/lib/status';
import type { ServiceRequestStatus } from '@/types';

const ACTIONS = [
  { href: '/organization/requests/new', icon: 'campaign', title: 'نشر طلب خدمة عامة', body: 'انشر احتياجك بالتكلفة والمدة والمنطقة ليستجيب له الأخصائيون.' },
  { href: '/organization/specialists', icon: 'search', title: 'البحث عن كفاءات', body: 'تصفح دليل الأخصائيين المعتمدين واكتشف المواهب البيئية.' },
  { href: '/organization/messages', icon: 'handshake', title: 'إدارة العقود', body: 'تابع رسائلك، أنشئ عقوداً جديدة، ووقع الاتفاقيات إلكترونياً.' },
] as const;

interface RecentSpecialist {
  specialistId: string;
  fullName: string;
  edu: string | null;
  city: string | null;
  lastInteractionAt: string;
  lastServiceName: string;
  lastStatus: ServiceRequestStatus;
  engagements: number;
}

type LoadState<T> = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: T };

function useRecentSpecialists(): LoadState<RecentSpecialist[]> {
  const [state, setState] = useState<LoadState<RecentSpecialist[]>>({ status: 'loading' });
  useEffect(() => {
    let active = true;
    fetch('/api/organization/recent-specialists')
      .then(async (res) => {
        if (!res.ok) throw new Error(`recent-specialists → ${res.status}`);
        return (await res.json()) as RecentSpecialist[];
      })
      .then((data) => active && setState({ status: 'ready', data }))
      .catch((error: unknown) => {
        console.error('[organization-home] recent specialists failed:', error);
        if (active) setState({ status: 'error' });
      });
    return () => {
      active = false;
    };
  }, []);
  return state;
}

/** Organization dashboard home: primary actions, ongoing requests, recent specialists. */
export function OrganizationHome() {
  const requests = useServiceRequests();
  const recent = useRecentSpecialists();
  const ongoing = requests.status === 'ready' ? requests.data.filter((r) => ONGOING_STATUSES.includes(r.status)) : [];

  return (
    <div className="fade-up space-y-8">
      <PageHeader title="مرحبًا بك في بوابة المنشآت" description="ابدأ من أحد المسارات التالية لإدارة احتياجاتك البيئية." />
      <ul className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {ACTIONS.map((action) => (
          <li key={action.href}>
            <Link href={action.href} className="card card-interactive group flex h-full flex-col p-6 no-underline">
              <span className="icon-tile icon-tile-lg mb-4">
                <span aria-hidden="true" className="material-symbols-outlined text-[28px]">{action.icon}</span>
              </span>
              <h3 className="mb-1.5 text-lg font-bold text-forest">{action.title}</h3>
              <p className="text-[15px] leading-relaxed text-muted">{action.body}</p>
            </Link>
          </li>
        ))}
      </ul>

      <section aria-labelledby="ongoing-requests" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 id="ongoing-requests" className="text-lg font-bold text-forest">
            الطلبات الجارية
            {requests.status === 'ready' && <span className="badge badge-neutral ms-2">{ongoing.length}</span>}
          </h3>
          <Link href="/organization/requests?tab=ongoing" className="btn btn-soft btn-sm">
            كل طلبات الخدمة العامة
          </Link>
        </div>
        {requests.status === 'loading' && <LoadingState />}
        {requests.status === 'error' && <ErrorState message="تعذر تحميل الطلبات الجارية." />}
        {requests.status === 'ready' && (
          <ServiceRequestList
            requests={ongoing}
            hrefBase="/organization/requests"
            empty="لا توجد طلبات جارية حاليًا. ستظهر هنا الطلبات التي قبلها أخصائي وبدأ العمل عليها."
          />
        )}
      </section>

      <section aria-labelledby="recent-specialists" className="space-y-3">
        <h3 id="recent-specialists" className="text-lg font-bold text-forest">
          آخر الأخصائيين الذين تم التعامل معهم
        </h3>
        {recent.status === 'loading' && <LoadingState />}
        {recent.status === 'error' && <ErrorState message="تعذر تحميل قائمة الأخصائيين." />}
        {recent.status === 'ready' && recent.data.length === 0 && (
          <div className="card px-4 py-10 text-center text-sm text-muted">
            لم تتعامل مع أي أخصائي بعد. عند قبول أحدهم لطلب من طلباتك سيظهر هنا.
          </div>
        )}
        {recent.status === 'ready' && recent.data.length > 0 && (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.data.map((item) => {
              const status = presentStatus(SERVICE_REQUEST_STATUS, item.lastStatus);
              return (
                <li key={item.specialistId}>
                  <Link
                    href={`/organization/specialists/${item.specialistId}`}
                    className="card card-interactive flex h-full flex-col gap-3 p-4 no-underline"
                  >
                    <div className="flex items-start gap-3">
                      <span className="icon-tile shrink-0">
                        <span aria-hidden="true" className="material-symbols-outlined text-[22px]">person</span>
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-forest">{item.fullName}</p>
                        <p className="truncate text-xs text-muted">
                          {[item.edu || 'لم يحدد التخصص', item.city].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </div>
                    <div className="mt-auto rounded-control bg-wash px-3 py-2 text-xs">
                      <p className="truncate font-semibold text-on-surface">آخر خدمة: {item.lastServiceName}</p>
                      <p className="mt-1 flex items-center justify-between gap-2 text-muted">
                        <span>
                          {formatDate(item.lastInteractionAt)} · {item.engagements} {item.engagements === 1 ? 'خدمة' : 'خدمات'}
                        </span>
                        <span className={`badge badge-${status.tone}`}>{status.label}</span>
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
