import { DetailList, type DetailItem } from '@/components/ui/DetailList';
import { formatDateAr } from '@/lib/format';
import { formatCost } from '@/lib/serviceRequests';
import { serviceTypeLabel } from '@/lib/serviceTypes';
import type { ServiceRequest } from '@/types';

import { RequestBadges } from './RequestBadges';

/** Read-only request summary shared by both detail pages. Legacy fields appear only on legacy rows. */
export function RequestDetails({ request, viewer }: { request: ServiceRequest; viewer: 'org' | 'spec' }) {
  const items: DetailItem[] = [
    {
      label: 'نوع الخدمة',
      wide: true,
      value:
        request.serviceTypes.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {request.serviceTypes.map((type) => (
              <li key={type} className="badge badge-brand">
                {serviceTypeLabel(type)}
              </li>
            ))}
          </ul>
        ) : (
          request.serviceName
        ),
    },
    { label: 'الحالة', value: <RequestBadges request={request} viewer={viewer} /> },
    { label: 'نوع الطلب', value: request.visibility === 'private' ? 'طلب خاص لأخصائي محدد' : 'طلب عام لأخصائيي المنطقة' },
    { label: 'المنطقة', value: request.region },
    ...(request.city ? [{ label: 'المدينة', value: request.city }] : []),
    ...(viewer === 'spec' && request.organizationName ? [{ label: 'المنشأة', value: request.organizationName }] : []),
    ...(viewer === 'org' && request.targetSpecialistName
      ? [{ label: 'الأخصائي المستهدف', value: request.targetSpecialistName }]
      : []),
    ...(request.specialistName ? [{ label: 'الأخصائي المتعاقد', value: request.specialistName }] : []),
    { label: 'تاريخ النشر', value: formatDateAr(request.createdAt) },
    ...(request.activityDescription ? [{ label: 'وصف النشاط', value: request.activityDescription, wide: true }] : []),
    ...(request.notes ? [{ label: 'ملاحظات', value: request.notes, wide: true }] : []),
    // Legacy (pre-0006) request form fields.
    ...(request.description ? [{ label: 'الوصف', value: request.description, wide: true }] : []),
    ...(request.serviceCategory ? [{ label: 'تصنيف الخدمة (سابق)', value: request.serviceCategory }] : []),
    ...(request.cost != null ? [{ label: 'التكلفة المعروضة (نموذج سابق)', value: formatCost(request.cost) }] : []),
    ...(request.duration ? [{ label: 'المدة (نموذج سابق)', value: request.duration }] : []),
    ...(request.status === 'rejected' && request.rejectionReason
      ? [{ label: 'سبب الرفض', value: request.rejectionReason, wide: true }]
      : []),
  ];
  return <DetailList items={items} />;
}
