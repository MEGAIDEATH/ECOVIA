import type { ReactNode } from 'react';

export interface DetailItem {
  label: string;
  value: ReactNode;
  /** Spans the full width (long text such as descriptions). */
  wide?: boolean;
}

/** Read-only key/value grid for detail pages (`<dl>` semantics). */
export function DetailList({ items }: { items: DetailItem[] }) {
  return (
    <dl className="card grid grid-cols-1 gap-x-8 gap-y-5 p-5 sm:grid-cols-2 md:p-6">
      {items.map((item) => (
        <div key={item.label} className={item.wide ? 'sm:col-span-2' : undefined}>
          <dt className="text-xs font-bold text-muted">{item.label}</dt>
          <dd className="mt-1 text-[15px] leading-relaxed whitespace-pre-wrap text-on-surface">
            {item.value || '-'}
          </dd>
        </div>
      ))}
    </dl>
  );
}
