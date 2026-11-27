import type { Metadata } from 'next';
import Link from 'next/link';

import { EmptyState } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination, hrefWith } from '@/features/marketplace/LinkTabs';
import { RequestCard } from '@/features/marketplace/RequestCard';
import { requireWorkspacePage } from '@/lib/auth/policies';
import { firstParam, type SearchParams } from '@/lib/searchParams';
import { ONGOING_STATUSES, parsePage } from '@/lib/serviceRequests';
import { listRequestsForSpecialist } from '@/repositories/serviceRequests';

export const metadata: Metadata = { title: 'خدماتي' };

/** خدماتي — requests contracted to this specialist (signed contracts), ongoing and finished. */
export default async function SpecialistServicesPage({ searchParams }: { searchParams: SearchParams }) {
  const { account, profile } = await requireWorkspacePage('spec', 'approved', '/specialist/services');
  const page = parsePage(firstParam((await searchParams).page));
  const { items, hasMore } = await listRequestsForSpecialist({ id: profile.id, userId: account.user.id }, 'contracted', { page });
  const ongoing = items.filter((request) => ONGOING_STATUSES.includes(request.status));
  const finished = items.filter((request) => !ONGOING_STATUSES.includes(request.status));

  const list = (requests: typeof items, empty: string) =>
    requests.length === 0 ? (
      <div className="card">
        <EmptyState message={empty} />
      </div>
    ) : (
      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {requests.map((request) => (
          <li key={request.id}>
            <RequestCard request={request} href={`/specialist/requests/${request.id}`} viewer="spec" />
          </li>
        ))}
      </ul>
    );

  return (
    <div className="fade-up space-y-8">
      <PageHeader
        title="خدماتي"
        description="الطلبات التي وقّعت عقودها، وحالة تنفيذ كل منها."
        actions={
          <Link href="/specialist/requests" className="btn btn-secondary">
            تصفح طلبات الخدمة
          </Link>
        }
      />
      <section aria-labelledby="services-ongoing" className="space-y-3">
        <h3 id="services-ongoing" className="font-bold text-forest">
          الخدمات الجارية <span className="badge badge-neutral ms-1">{ongoing.length}</span>
        </h3>
        {list(ongoing, 'لا توجد خدمات جارية. قدّم عرضاً على أحد الطلبات لتبدأ.')}
      </section>
      <section aria-labelledby="services-finished" className="space-y-3">
        <h3 id="services-finished" className="font-bold text-forest">
          الخدمات المكتملة <span className="badge badge-neutral ms-1">{finished.length}</span>
        </h3>
        {list(finished, 'لا توجد خدمات مكتملة بعد.')}
      </section>
      <Pagination page={page} hasMore={hasMore} hrefFor={(n) => hrefWith('/specialist/services', { page: n })} />
    </div>
  );
}
