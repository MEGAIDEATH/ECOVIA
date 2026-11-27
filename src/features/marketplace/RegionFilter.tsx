'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

import { REGIONS } from '@/lib/regions';

/**
 * Region filter for specialist discovery, stored in `?region=<code>` so it
 * survives refreshes and bookmarks. It is a real GET form (works without
 * JavaScript via the submit button); with JavaScript the URL updates as soon
 * as a region is chosen. The server validates the code — unknown values are
 * ignored and reported.
 */
export function RegionFilter({
  selected,
  ownRegionCode,
  tab,
}: {
  selected: string | null;
  ownRegionCode: string | null;
  tab: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const go = (code: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (code) params.set('region', code);
    else params.delete('region');
    params.delete('page');
    const query = params.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  };

  return (
    <form method="get" action={pathname} className="card mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-end" aria-busy={pending}>
      <input type="hidden" name="tab" value={tab} />
      <div className="flex-1">
        <label htmlFor="region-filter" className="field-label">
          تصفية حسب المنطقة
        </label>
        <select
          id="region-filter"
          name="region"
          defaultValue={selected ?? ''}
          key={selected ?? 'all'}
          onChange={(event) => go(event.target.value)}
          className="field-input"
        >
          <option value="">كل المناطق</option>
          {REGIONS.map((region) => (
            <option key={region.code} value={region.code}>
              {region.nameAr}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        {ownRegionCode && ownRegionCode !== selected && (
          <button type="button" onClick={() => go(ownRegionCode)} className="btn btn-soft">
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              my_location
            </span>
            منطقتي
          </button>
        )}
        <noscript>
          <button type="submit" className="btn btn-secondary">
            تطبيق
          </button>
        </noscript>
        {selected && (
          <button type="button" onClick={() => go('')} className="btn btn-ghost">
            إزالة التصفية
          </button>
        )}
      </div>
    </form>
  );
}
