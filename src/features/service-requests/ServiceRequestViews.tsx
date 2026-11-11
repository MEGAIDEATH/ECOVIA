'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, type ReactNode } from 'react';

import { DetailList } from '@/components/ui/DetailList';
import { EmptyState } from '@/components/ui/Feedback';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  REQUEST_CATEGORIES,
  categorizeRequest,
  formatCost,
  type RequestCategory,
} from '@/lib/serviceRequests';
import { DECLINED_BY_ME, SERVICE_REQUEST_STATUS, presentStatus } from '@/lib/status';
import type { ServiceRequest } from '@/types';

export function RequestStatusBadge({ request }: { request: Pick<ServiceRequest, 'status' | 'declinedByMe'> }) {
  const presentation = request.declinedByMe ? DECLINED_BY_ME : presentStatus(SERVICE_REQUEST_STATUS, request.status);
  return <StatusBadge tone={presentation.tone}>{presentation.label}</StatusBadge>;
}

export function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
}

/** The four facts a specialist needs to decide — shown on every card. */
function KeyFacts({ request }: { request: ServiceRequest }) {
  const facts = [
    { icon: 'payments', label: 'تكلفة الخدمة', value: formatCost(request.cost) },
    { icon: 'schedule', label: 'المدة المطلوبة', value: request.duration || '-' },
    { icon: 'location_on', label: 'المنطقة', value: request.region || '-' },
  ];
  return (
    <dl className="mt-3 grid grid-cols-1 gap-2 xs:grid-cols-3">
      {facts.map((fact) => (
        <div key={fact.label} className="flex items-center gap-2 rounded-control bg-wash px-3 py-2">
          <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-secondary">
            {fact.icon}
          </span>
          <div className="min-w-0">
            <dt className="text-[11px] font-semibold text-muted">{fact.label}</dt>
            <dd className="truncate text-sm font-bold text-on-surface">{fact.value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

export function ServiceRequestCard({ request, href }: { request: ServiceRequest; href: string }) {
  const meta = [request.organizationName, request.specialistName && `الأخصائي: ${request.specialistName}`, formatDate(request.createdAt)]
    .filter(Boolean)
    .join(' · ');
  return (
    <Link href={href} className="card card-interactive block p-4 no-underline md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base leading-snug font-bold text-forest">
            <span className="sr-only">اسم الخدمة: </span>
            {request.serviceName}
          </h3>
          {meta && <p className="mt-0.5 truncate text-xs text-muted">{meta}</p>}
        </div>
        <RequestStatusBadge request={request} />
      </div>
      <KeyFacts request={request} />
    </Link>
  );
}

interface ServiceRequestListProps {
  requests: ServiceRequest[];
  /** Detail route prefix, e.g. "/organization/requests". */
  hrefBase: string;
  empty: ReactNode;
}

export function ServiceRequestList({ requests, hrefBase, empty }: ServiceRequestListProps) {
  if (requests.length === 0) {
    return <div className="card">{typeof empty === 'string' ? <EmptyState message={empty} /> : empty}</div>;
  }
  return (
    <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {requests.map((request) => (
        <li key={request.id}>
          <ServiceRequestCard request={request} href={`${hrefBase}/${request.id}`} />
        </li>
      ))}
    </ul>
  );
}

function isCategory(value: string | null): value is RequestCategory {
  return value === 'pending' || value === 'ongoing' || value === 'previous';
}

/**
 * Pending / ongoing / previous tabs over one request list. The active tab is
 * kept in `?tab=` so it survives reloads and back navigation.
 */
export function RequestCategoryTabs({
  requests,
  hrefBase,
  emptyAction,
}: {
  requests: ServiceRequest[];
  hrefBase: string;
  /** Extra content in the pending empty state (e.g. "publish a request"). */
  emptyAction?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const active: RequestCategory = isCategory(tabParam) ? tabParam : 'pending';

  const grouped = useMemo(() => {
    const groups: Record<RequestCategory, ServiceRequest[]> = { pending: [], ongoing: [], previous: [] };
    for (const request of requests) groups[categorizeRequest(request)].push(request);
    return groups;
  }, [requests]);

  const select = (key: RequestCategory) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const current = REQUEST_CATEGORIES.find((c) => c.key === active) ?? REQUEST_CATEGORIES[0];

  return (
    <div>
      <div
        role="tablist"
        aria-label="تصنيف الطلبات"
        className="scrollbar-none mb-5 flex gap-1 overflow-x-auto rounded-btn border border-line bg-white p-1"
      >
        {REQUEST_CATEGORIES.map((category, index) => {
          const selected = category.key === active;
          return (
            <button
              key={category.key}
              id={`tab-${category.key}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`panel-${category.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(category.key)}
              onKeyDown={(event) => {
                const step = event.key === 'ArrowLeft' ? 1 : event.key === 'ArrowRight' ? -1 : 0;
                if (!step) return;
                event.preventDefault();
                const next = REQUEST_CATEGORIES[(index + step + REQUEST_CATEGORIES.length) % REQUEST_CATEGORIES.length];
                select(next.key);
                document.getElementById(`tab-${next.key}`)?.focus();
              }}
              className={`flex flex-1 shrink-0 items-center justify-center gap-2 rounded-control px-3 py-2 text-sm font-bold whitespace-nowrap transition-colors ${
                selected ? 'bg-forest text-white' : 'text-on-surface-variant hover:bg-wash'
              }`}
            >
              {category.label}
              <span className={`badge ${selected ? 'bg-white/20 text-white' : 'badge-neutral'}`}>
                {grouped[category.key].length}
              </span>
            </button>
          );
        })}
      </div>
      <div id={`panel-${active}`} role="tabpanel" aria-labelledby={`tab-${active}`}>
        <ServiceRequestList
          requests={grouped[active]}
          hrefBase={hrefBase}
          empty={
            <div className="flex flex-col items-center gap-3 px-4 py-10 text-center text-sm text-muted">
              {current.empty}
              {active === 'pending' && emptyAction}
            </div>
          }
        />
      </div>
    </div>
  );
}

/** Read-only request summary shared by both detail pages. */
export function ServiceRequestDetails({ request }: { request: ServiceRequest }) {
  return (
    <DetailList
      items={[
        { label: 'اسم الخدمة', value: request.serviceName },
        { label: 'تكلفة الخدمة', value: formatCost(request.cost) },
        { label: 'المدة المطلوبة', value: request.duration },
        { label: 'المنطقة', value: request.region },
        { label: 'الحالة', value: <RequestStatusBadge request={request} /> },
        ...(request.organizationName ? [{ label: 'المنشأة', value: request.organizationName }] : []),
        ...(request.specialistName ? [{ label: 'الأخصائي المنفّذ', value: request.specialistName }] : []),
        ...(request.city ? [{ label: 'المدينة', value: request.city }] : []),
        ...(request.serviceCategory ? [{ label: 'تصنيف الخدمة', value: request.serviceCategory }] : []),
        { label: 'تاريخ النشر', value: formatDate(request.createdAt) },
        ...(request.description ? [{ label: 'الوصف', value: request.description, wide: true }] : []),
        ...(request.status === 'rejected' && request.rejectionReason
          ? [{ label: 'سبب الرفض', value: request.rejectionReason, wide: true }]
          : []),
      ]}
    />
  );
}
