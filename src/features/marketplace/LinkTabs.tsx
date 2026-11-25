import Link from 'next/link';

export interface LinkTab {
  key: string;
  label: string;
  href: string;
  count?: number;
}

/**
 * URL-driven tabs (`?tab=`): plain links, so the selection survives reloads,
 * bookmarks and back/forward without client JavaScript.
 */
export function LinkTabs({ tabs, active, label }: { tabs: readonly LinkTab[]; active: string; label: string }) {
  return (
    <nav aria-label={label} className="mb-5">
      <ul className="scrollbar-none flex gap-1 overflow-x-auto rounded-btn border border-line bg-white p-1">
        {tabs.map((tab) => {
          const selected = tab.key === active;
          return (
            <li key={tab.key} className="flex-1 shrink-0">
              <Link
                href={tab.href}
                aria-current={selected ? 'page' : undefined}
                scroll={false}
                className={`flex items-center justify-center gap-2 rounded-control px-3 py-2 text-sm font-bold whitespace-nowrap no-underline transition-colors ${
                  selected ? 'bg-forest text-white' : 'text-on-surface-variant hover:bg-wash'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`badge ${selected ? 'bg-white/20 text-white' : 'badge-neutral'}`}>{tab.count}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Builds `path?…` keeping the given params and dropping empty ones. */
export function hrefWith(path: string, params: Record<string, string | number | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '' && !(key === 'page' && value === 1)) {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export function Pagination({
  page,
  hasMore,
  hrefFor,
}: {
  page: number;
  hasMore: boolean;
  hrefFor: (page: number) => string;
}) {
  if (page === 1 && !hasMore) return null;
  return (
    <nav aria-label="التنقل بين الصفحات" className="mt-5 flex items-center justify-between gap-3">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className="btn btn-secondary btn-sm">
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
            chevron_right
          </span>
          السابق
        </Link>
      ) : (
        <span />
      )}
      <span className="text-xs text-muted">صفحة {page}</span>
      {hasMore ? (
        <Link href={hrefFor(page + 1)} className="btn btn-secondary btn-sm">
          التالي
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
            chevron_left
          </span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
