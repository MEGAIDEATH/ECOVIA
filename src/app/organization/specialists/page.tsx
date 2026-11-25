import type { Metadata } from 'next';
import Form from 'next/form';
import Link from 'next/link';

import { EmptyState } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/features/marketplace/LinkTabs';
import { AutoSubmitSelect } from '@/features/organizations/specialists/AutoSubmitSelect';
import { ContactSpecialistButton } from '@/features/organizations/specialists/ContactSpecialistButton';
import { requireWorkspacePage } from '@/lib/auth/policies';
import {
  DIRECTORY_PAGE_SIZE,
  YEARS_BUCKETS,
  directoryQuery,
  filterSpecialists,
  hasActiveFilters,
  parseDirectoryFilters,
} from '@/lib/directory';
import { REGIONS } from '@/lib/regions';
import type { SearchParams } from '@/lib/searchParams';
import { listApprovedSpecialists } from '@/repositories/profiles';

export const metadata: Metadata = { title: 'دليل الكفاءات' };

const PATH = '/organization/specialists';

/**
 * Competency directory. Filters live in the URL (`?q=&region=&years=&city=&page=`)
 * so results survive refresh, bookmarks and back/forward; filtering happens on
 * the server. Only approved specialists are listed (the viewer excluded).
 */
export default async function OrganizationSpecialistsPage({ searchParams }: { searchParams: SearchParams }) {
  const { account } = await requireWorkspacePage('org', 'approved', PATH);
  const filters = parseDirectoryFilters(await searchParams);
  const all = (await listApprovedSpecialists()).filter((spec) => spec.userId !== account.user.id);
  const matches = filterSpecialists(all, filters);
  const start = (filters.page - 1) * DIRECTORY_PAGE_SIZE;
  const items = matches.slice(start, start + DIRECTORY_PAGE_SIZE);
  const active = hasActiveFilters(filters);

  return (
    <div className="fade-up">
      <PageHeader title="دليل الكفاءات" description="أخصائيون بيئيون معتمدون — ابحث بالتخصص أو الاسم أو المنطقة." />
      <Form action={PATH} className="card mb-6 flex flex-col gap-3 p-4" role="search" aria-label="بحث في دليل الكفاءات">
        <div className="flex flex-col gap-2 md:flex-row">
          <div className="relative flex-1">
            <label htmlFor="org-search-input" className="sr-only">
              ابحث بالتخصص أو الاسم
            </label>
            <input
              id="org-search-input"
              name="q"
              type="search"
              defaultValue={filters.q}
              maxLength={80}
              placeholder="ابحث بالتخصص أو الاسم..."
              className="field-input pr-11"
            />
            <span aria-hidden="true" className="material-symbols-outlined pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted">
              search
            </span>
          </div>
          <div className="md:w-56">
            <label htmlFor="region-filter" className="sr-only">
              فلترة حسب المنطقة
            </label>
            <AutoSubmitSelect id="region-filter" name="region" defaultValue={filters.region ?? ''} className="field-input">
              <option value="">كل المناطق</option>
              {REGIONS.map((region) => (
                <option key={region.code} value={region.code}>
                  {region.nameAr}
                </option>
              ))}
            </AutoSubmitSelect>
          </div>
          <div className="md:w-52">
            <label htmlFor="years-filter" className="sr-only">
              فلترة حسب سنوات الخبرة
            </label>
            <AutoSubmitSelect id="years-filter" name="years" defaultValue={filters.years ?? ''} className="field-input">
              <option value="">كل الخبرات</option>
              {YEARS_BUCKETS.map((bucket) => (
                <option key={bucket.value} value={bucket.value}>
                  {bucket.label}
                </option>
              ))}
            </AutoSubmitSelect>
          </div>
          <div className="md:w-44">
            <label htmlFor="city-filter" className="sr-only">
              فلترة حسب المدينة
            </label>
            <input id="city-filter" name="city" defaultValue={filters.city} maxLength={60} placeholder="المدينة..." className="field-input" />
          </div>
          <button type="submit" className="btn btn-primary">
            بحث
          </button>
        </div>
        <div className="flex items-center justify-between text-xs text-muted">
          <span aria-live="polite">
            {matches.length} {active ? 'نتيجة مطابقة' : 'أخصائي معتمد'}
          </span>
          {active && (
            <Link href={PATH} className="btn btn-ghost btn-sm">
              مسح الفلاتر
            </Link>
          )}
        </div>
      </Form>

      {items.length === 0 ? (
        <div className="card">
          <EmptyState message={active ? 'لا توجد نتائج مطابقة' : 'لا يوجد كفاءات معتمدة'} />
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((spec) => (
            <li key={spec.id}>
              <article className="card card-interactive flex h-full flex-col p-5" data-testid="directory-card">
                <div className="mb-4 flex items-start gap-3">
                  <span className="icon-tile shrink-0">
                    <span aria-hidden="true" className="material-symbols-outlined text-[22px]">
                      person
                    </span>
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-forest">{spec.fullName || 'أخصائي'}</h3>
                    <p className="text-sm text-muted">{spec.edu || 'لم يحدد التخصص'}</p>
                    {(spec.region || spec.city) && (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
                        <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                          location_on
                        </span>
                        {[spec.city, spec.region].filter(Boolean).join(' — ')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Link href={`${PATH}/${spec.id}`} className="btn btn-secondary btn-sm flex-1">
                    الملف
                  </Link>
                  <ContactSpecialistButton specialistUserId={spec.userId} compact />
                  <Link href={`/organization/requests/new?specialist=${spec.id}`} className="btn btn-soft btn-sm w-full">
                    <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                      lock
                    </span>
                    طلب خاص
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
      <Pagination
        page={filters.page}
        hasMore={start + DIRECTORY_PAGE_SIZE < matches.length}
        hrefFor={(page) => `${PATH}${directoryQuery({ ...filters, page })}`}
      />
    </div>
  );
}
