'use client';

import { forwardRef, useState } from 'react';

import { DocumentViewer } from '@/components/ui/DocumentViewer';
import { formatExperienceYears, maskNationalIdForOrganization } from '@/lib/utils/cv';
import { isProtectedFileUrl, safeDownloadUrl, safeExternalUrl, safeImageUrl } from '@/lib/utils/url';

export interface CVPreviewData {
  fullName?: string | null;
  nationalId?: string | null;
  email?: string | null;
  phone?: string | null;
  edu?: string | null;
  city?: string | null;
  years?: string | number | null;
  license?: string | null;
  exp?: string | null;
  portfolio?: string | null;
  profilePic?: string | null;
  resumeFile?: string | null;
}

interface CVDocumentProps {
  data: CVPreviewData;
  /** Organization-facing view masks the national ID (first 3 + **** + rest). */
  asOrganization?: boolean;
  /** Show the uploaded CV file inline right away (profile page). */
  resumeOpen?: boolean;
}

const CARD = 'rounded-control border border-line bg-wash p-3';
const LABEL = 'mb-1 block text-[11px] font-bold text-muted';

/**
 * The CV as one printable document: identity, credentials, contact,
 * experience, portfolio and the uploaded CV file. Used by the preview dialog,
 * the organization's specialist profile and CV printing.
 */
export const CVDocument = forwardRef<HTMLElement, CVDocumentProps>(function CVDocument(
  { data, asOrganization = false, resumeOpen = false },
  ref,
) {
  const [showResume, setShowResume] = useState(resumeOpen);
  const rawId = data.nationalId ?? '';
  const displayId = asOrganization && rawId.length >= 10 ? maskNationalIdForOrganization(rawId) : rawId || '-';

  // User-controlled links render as links only when safe (see lib/utils/url).
  const profileUrl = safeImageUrl(data.profilePic);
  const portfolioUrl = safeExternalUrl(data.portfolio);
  const resumeUrl = safeDownloadUrl(data.resumeFile);
  const viewable = resumeUrl !== null && isProtectedFileUrl(resumeUrl);

  return (
    <article ref={ref} className="space-y-4" aria-label={`السيرة الذاتية: ${data.fullName || 'بدون اسم'}`}>
      <p className="print-only mb-2 text-xs text-muted">السيرة الذاتية — إيكوفيا</p>
      <div className="flex items-center gap-4 rounded-card border border-secondary/15 bg-accent-soft p-4">
        {profileUrl ? (
          <img src={profileUrl} alt="الصورة الشخصية" className="size-16 rounded-full border border-secondary/20 object-cover" />
        ) : null}
        <div>
          <h4 className="text-lg font-bold text-forest">{data.fullName || 'بدون اسم'}</h4>
          <p className="text-sm text-muted">{data.edu || 'لم يحدد التخصص'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className={CARD}>
          <span className={LABEL}>رقم الهوية</span>
          <span className="font-mono font-medium text-on-surface">{displayId}</span>
        </div>
        <div className={CARD}>
          <span className={LABEL}>رقم الترخيص</span>
          <span className="font-mono font-medium text-on-surface">{data.license || 'لا يوجد'}</span>
        </div>
        <div className={CARD}>
          <span className={LABEL}>المدينة</span>
          <span className="font-medium text-on-surface">{data.city || '-'}</span>
        </div>
        <div className={CARD}>
          <span className={LABEL}>البريد الإلكتروني</span>
          <span className="text-left font-medium text-on-surface" dir="ltr">
            {data.email || '-'}
          </span>
        </div>
        <div className={CARD}>
          <span className={LABEL}>رقم الجوال</span>
          <span className="text-left font-mono font-medium text-on-surface" dir="ltr">
            {data.phone || '-'}
          </span>
        </div>
        <div className={`${CARD} col-span-2 flex items-center justify-between`}>
          <span className="text-[11px] font-bold text-muted">الخبرة</span>
          <span className="badge badge-brand">{formatExperienceYears(data.years)}</span>
        </div>
      </div>

      <section className="rounded-control border border-line bg-white p-4">
        <h5 className="mb-2 text-xs font-bold text-muted">نبذة وخبرات مفصلة</h5>
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-on-surface">{data.exp || 'لا توجد خبرات مفصلة.'}</p>
      </section>

      {data.portfolio ? (
        <div className="flex items-center gap-2 rounded-control border border-line bg-white p-4">
          <span aria-hidden="true" className="material-symbols-outlined text-muted">link</span>
          {portfolioUrl ? (
            <a href={portfolioUrl} target="_blank" rel="noopener noreferrer" className="truncate text-sm font-semibold text-secondary hover:underline" dir="ltr">
              {data.portfolio}
            </a>
          ) : (
            // Legacy / unsafe value (e.g. javascript:) — inert text, never a link.
            <span className="truncate text-sm text-muted" dir="ltr">
              {data.portfolio}
            </span>
          )}
        </div>
      ) : null}

      {data.resumeFile ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-secondary/20 bg-accent-soft p-4">
            <div className="flex items-center gap-2 font-bold text-forest">
              <span aria-hidden="true" className="material-symbols-outlined">picture_as_pdf</span> ملف السيرة المرفق
            </div>
            {resumeUrl ? (
              <div className="print-hidden flex gap-2">
                {viewable && (
                  <button
                    type="button"
                    onClick={() => setShowResume((v) => !v)}
                    aria-expanded={showResume}
                    className="btn btn-primary btn-sm"
                  >
                    {showResume ? 'إخفاء الملف' : 'عرض الملف'}
                  </button>
                )}
                <a href={resumeUrl} download="CV.pdf" className="btn btn-secondary btn-sm">
                  تحميل
                </a>
              </div>
            ) : (
              // Legacy / unsafe value — inert text, never a link.
              <span className="max-w-[12rem] truncate text-xs font-bold text-muted" dir="ltr">
                {data.resumeFile}
              </span>
            )}
          </div>
          {viewable && showResume && (
            <div className="print-hidden">
              <DocumentViewer src={resumeUrl} title={`السيرة الذاتية — ${data.fullName || 'الأخصائي'}`} downloadName="CV.pdf" />
            </div>
          )}
        </section>
      ) : null}
    </article>
  );
});
