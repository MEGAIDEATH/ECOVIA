import type { Metadata } from 'next';

import { EmptyState } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { LinkTabs, Pagination, hrefWith } from '@/features/marketplace/LinkTabs';
import { RegionFilter } from '@/features/marketplace/RegionFilter';
import { RequestCard } from '@/features/marketplace/RequestCard';
import { requireWorkspacePage } from '@/lib/auth/policies';
import { regionByCode, regionByName } from '@/lib/regions';
import { firstParam, type SearchParams } from '@/lib/searchParams';
import { SPECIALIST_TABS, parsePage, parseSpecialistTab } from '@/lib/serviceRequests';
import { countRequestsForSpecialist, listRequestsForSpecialist } from '@/repositories/serviceRequests';

export const metadata: Metadata = { title: 'طلبات الخدمة' };

const PATH = '/specialist/requests';

/**
 * Specialist request discovery. `?tab=` (open | offers | contracted |
 * declined), `?region=<code>` (public requests of one region), `?page=`.
 * Private requests addressed to this specialist always appear in "open";
 * nobody else ever sees them. Visibility is enforced in the SQL query.
 */
export default async function SpecialistRequestsPage({ searchParams }: { searchParams: SearchParams }) {
  const { account, profile } = await requireWorkspacePage('spec', 'approved', PATH);
  const params = await searchParams;
  const tab = parseSpecialistTab(firstParam(params.tab));
  const page = parsePage(firstParam(params.page));
  const regionParam = firstParam(params.region);
  const region = regionByCode(regionParam);
  const unknownRegion = Boolean(regionParam) && !region;
  const viewer = { id: profile.id, userId: account.user.id };

  const [{ items, hasMore }, counts] = await Promise.all([
    listRequestsForSpecialist(viewer, tab, { regionName: region?.nameAr ?? null, page }),
    countRequestsForSpecialist(viewer),
  ]);
  const ownRegion = regionByName(profile.region);
  const current = SPECIALIST_TABS.find((entry) => entry.key === tab)!;
  const tabCounts: Partial<Record<string, number>> = {
    open: counts.open,
    offers: counts.activeOffers,
    contracted: counts.contracted,
  };

  return (
    <div className="fade-up">
      <PageHeader
        title="طلبات الخدمة"
        description="طلبات المنشآت المفتوحة في منطقتك وفي بقية المناطق، والطلبات الخاصة الموجهة إليك. قدّم عرضك مع المدة اللازمة للتنفيذ."
      />
      <LinkTabs
        label="تصنيف الطلبات"
        active={tab}
        tabs={SPECIALIST_TABS.map((entry) => ({
          key: entry.key,
          label: entry.label,
          href: hrefWith(PATH, { tab: entry.key === 'open' ? null : entry.key, region: region?.code }),
          count: tabCounts[entry.key],
        }))}
      />
      {tab === 'open' && (
        <>
          <RegionFilter selected={region?.code ?? null} ownRegionCode={ownRegion?.code ?? null} tab={tab} />
          {unknownRegion && (
            <p role="alert" className="alert alert-warning mb-5">
              المنطقة المحددة في الرابط غير معروفة؛ تُعرض الطلبات من كل المناطق.
            </p>
          )}
          {!ownRegion && (
            <p className="alert alert-info mb-5">
              حدّد منطقة عملك في السيرة الذاتية لتصلك إشعارات بالطلبات الجديدة في منطقتك.
            </p>
          )}
        </>
      )}
      {items.length === 0 ? (
        <div className="card">
          <EmptyState message={region && tab === 'open' ? `لا توجد طلبات مفتوحة في ${region.nameAr} حالياً.` : current.empty} />
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {items.map((request) => (
            <li key={request.id}>
              <RequestCard request={request} href={`${PATH}/${request.id}`} viewer="spec" />
            </li>
          ))}
        </ul>
      )}
      <Pagination
        page={page}
        hasMore={hasMore}
        hrefFor={(n) => hrefWith(PATH, { tab: tab === 'open' ? null : tab, region: region?.code, page: n })}
      />
    </div>
  );
}
