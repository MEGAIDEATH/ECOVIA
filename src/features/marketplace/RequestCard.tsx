import Link from 'next/link';

import { formatDateAr } from '@/lib/format';
import { requestTitle, serviceTypeLabel } from '@/lib/serviceTypes';
import type { ServiceRequest } from '@/types';

import { RequestBadges } from './RequestBadges';

/** One request in a list (both workspaces). Links to the role's detail page. */
export function RequestCard({
  request,
  href,
  viewer,
}: {
  request: ServiceRequest;
  href: string;
  viewer: 'org' | 'spec';
}) {
  const meta = [
    viewer === 'spec' ? request.organizationName : null,
    viewer === 'org' && request.visibility === 'private' && request.targetSpecialistName
      ? `موجه إلى: ${request.targetSpecialistName}`
      : null,
    request.specialistName ? `الأخصائي المتعاقد: ${request.specialistName}` : null,
    formatDateAr(request.createdAt),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link href={href} className="card card-interactive block p-4 no-underline md:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-base leading-snug font-bold text-forest">{requestTitle(request)}</h3>
          {meta && <p className="mt-0.5 truncate text-xs text-muted">{meta}</p>}
        </div>
        <RequestBadges request={request} viewer={viewer} />
      </div>
      {request.serviceTypes.length > 1 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="أنواع الخدمة">
          {request.serviceTypes.map((type) => (
            <li key={type} className="badge badge-neutral">
              {serviceTypeLabel(type)}
            </li>
          ))}
        </ul>
      )}
      <dl className="mt-3 grid grid-cols-1 gap-2 xs:grid-cols-2">
        <div className="flex items-center gap-2 rounded-control bg-wash px-3 py-2">
          <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-secondary">
            location_on
          </span>
          <div className="min-w-0">
            <dt className="text-[11px] font-semibold text-muted">المنطقة</dt>
            <dd className="truncate text-sm font-bold text-on-surface">
              {[request.region, request.city].filter(Boolean).join(' — ')}
            </dd>
          </div>
        </div>
        {viewer === 'org' && request.status === 'pending' ? (
          <div className="flex items-center gap-2 rounded-control bg-wash px-3 py-2">
            <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-secondary">
              local_offer
            </span>
            <div>
              <dt className="text-[11px] font-semibold text-muted">العروض النشطة</dt>
              <dd className="text-sm font-bold text-on-surface">{request.offerCount ?? 0}</dd>
            </div>
          </div>
        ) : (
          request.activityDescription && (
            <div className="flex min-w-0 items-center gap-2 rounded-control bg-wash px-3 py-2">
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-secondary">
                description
              </span>
              <div className="min-w-0">
                <dt className="text-[11px] font-semibold text-muted">النشاط</dt>
                <dd className="truncate text-sm font-bold text-on-surface">{request.activityDescription}</dd>
              </div>
            </div>
          )
        )}
      </dl>
    </Link>
  );
}
