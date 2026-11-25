import type { Metadata } from 'next';

import { PageHeader } from '@/components/ui/PageHeader';
import { RequestForm } from '@/features/marketplace/RequestForm';
import { requireWorkspacePage } from '@/lib/auth/policies';
import { firstParam, type SearchParams } from '@/lib/searchParams';
import { getPrivateRequestTarget } from '@/repositories/serviceRequests';
import { createServiceRequestAction } from '@/server/actions/marketplace';

export const metadata: Metadata = { title: 'طلب خدمة جديد' };

/**
 * "Submit New Service Request". `?specialist=<id>` turns it into a private
 * request for that specialist (validated: approved, not the facility itself).
 */
export default async function NewServiceRequestPage({ searchParams }: { searchParams: SearchParams }) {
  const { account } = await requireWorkspacePage('org', 'approved', '/organization/requests/new');
  const specialistParam = firstParam((await searchParams).specialist);
  const target = specialistParam ? await getPrivateRequestTarget(specialistParam, account.user.id) : null;

  return (
    <div className="fade-up">
      <PageHeader
        title={target ? 'طلب خدمة خاص' : 'طلب خدمة جديد'}
        description={
          target
            ? 'يصل هذا الطلب إلى الأخصائي المحدد فقط، ويمكنه تقديم عرض بمدة التنفيذ.'
            : 'حدّد نوع الخدمة المطلوبة وصف نشاطك؛ يقدّم الأخصائيون عروضهم مع المدة اللازمة للتنفيذ.'
        }
        back={{ href: '/organization/requests', label: 'طلبات الخدمة' }}
      />
      {specialistParam && !target && (
        <p role="alert" className="alert alert-warning mb-5">
          الأخصائي المحدد غير متاح لاستقبال طلب خاص؛ يمكنك نشر طلب عام بدلاً من ذلك.
        </p>
      )}
      <RequestForm
        action={createServiceRequestAction}
        target={target ? { id: target.id, name: target.fullName } : null}
        defaultRegionCode={null}
      />
    </div>
  );
}
