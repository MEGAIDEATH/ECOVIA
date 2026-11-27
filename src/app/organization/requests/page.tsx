import type { Metadata } from 'next';
import Link from 'next/link';

import { EmptyState } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { LinkTabs, Pagination, hrefWith } from '@/features/marketplace/LinkTabs';
import { RequestCard } from '@/features/marketplace/RequestCard';
import { requireWorkspacePage } from '@/lib/auth/policies';
import { firstParam, type SearchParams } from '@/lib/searchParams';
import { CATEGORY_STATUSES, REQUEST_CATEGORIES, parsePage, parseRequestCategory } from '@/lib/serviceRequests';
import { countRequestsByStatusForOrganization, listRequestsForOrganization } from '@/repositories/serviceRequests';

export const metadata: Metadata = { title: 'طلبات الخدمة' };

const PATH = '/organization/requests';

export default async function OrganizationRequestsPage({ searchParams }: { searchParams: SearchParams }) {
  const { profile } = await requireWorkspacePage('org', 'approved', PATH);
  const params = await searchParams;
  const tab = parseRequestCategory(firstParam(params.tab));
  const page = parsePage(firstParam(params.page));
  const [{ items, hasMore }, counts] = await Promise.all([
    listRequestsForOrganization(profile.id, tab, page),
    countRequestsByStatusForOrganization(profile.id),
  ]);
  const current = REQUEST_CATEGORIES.find((category) => category.key === tab)!;

  return (
    <div className="fade-up">
      <PageHeader
        title="طلبات الخدمة"
        description="طلباتك العامة والخاصة، والعروض التي وصلت عليها، وحالة كل تعاقد."
        actions={
          <Link href="/organization/requests/new" className="btn btn-primary">
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              add
            </span>
            طلب خدمة جديد
          </Link>
        }
      />
      <LinkTabs
        label="تصنيف الطلبات"
        active={tab}
        tabs={REQUEST_CATEGORIES.map((category) => ({
          key: category.key,
          label: category.label,
          href: hrefWith(PATH, { tab: category.key === 'open' ? null : category.key }),
          count: CATEGORY_STATUSES[category.key].reduce((sum, status) => sum + counts[status], 0),
        }))}
      />
      {items.length === 0 ? (
        <div className="card">
          <EmptyState message={current.empty} />
          {tab === 'open' && (
            <div className="-mt-4 flex justify-center pb-8">
              <Link href="/organization/requests/new" className="btn btn-soft btn-sm">
                انشر طلبك الأول
              </Link>
            </div>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {items.map((request) => (
            <li key={request.id}>
              <RequestCard request={request} href={`${PATH}/${request.id}`} viewer="org" />
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} hasMore={hasMore} hrefFor={(n) => hrefWith(PATH, { tab: tab === 'open' ? null : tab, page: n })} />
    </div>
  );
}
