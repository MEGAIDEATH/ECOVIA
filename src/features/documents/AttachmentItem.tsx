'use client';

import { useState } from 'react';

import { DocumentViewer } from '@/components/ui/DocumentViewer';

/**
 * One attachment row with an on-demand inline viewer: the protected file is
 * only requested after "عرض المرفق" is pressed.
 */
export function AttachmentItem({
  id,
  label,
  details,
  viewable,
}: {
  id: string;
  label: string;
  details: string;
  viewable: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-control border border-line bg-wash p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-forest">{label}</p>
          <p className="text-xs text-muted">{details}</p>
        </div>
        {viewable ? (
          <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="btn btn-secondary btn-sm">
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              {open ? 'visibility_off' : 'visibility'}
            </span>
            {open ? 'إخفاء' : 'عرض المرفق'}
          </button>
        ) : (
          <span className="text-xs text-muted">صيغة غير مدعومة للعرض</span>
        )}
      </div>
      {open && (
        <div className="mt-3">
          <DocumentViewer src={`/api/files/${id}`} title={label} downloadName={label} />
        </div>
      )}
    </li>
  );
}
