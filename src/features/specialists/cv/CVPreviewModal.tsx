'use client';

import { Modal } from '@/components/ui/Modal';
import { formatExperienceYears, maskNationalIdForOrganization } from '@/lib/utils/cv';
import { safeDownloadUrl, safeExternalUrl, safeImageUrl } from '@/lib/utils/url';

export interface CVPreviewData {
  fullName?: string | null;
  nationalId?: string | null;
  email?: string | null;
  phone?: string | null;
  edu?: string | null;
  years?: string | number | null;
  license?: string | null;
  exp?: string | null;
  portfolio?: string | null;
  profilePic?: string | null;
  resumeFile?: string | null;
}

interface CVPreviewModalProps {
  open: boolean;
  onClose: () => void;
  data: CVPreviewData;
  /**
   * Organization-facing preview: the national ID is masked
   * (first 3 chars + **** + remainder), exactly like the legacy modal.
   */
  asOrganization?: boolean;
}

const CARD = 'bg-white p-3 rounded-xl border';
const LABEL = 'block text-[11px] text-secondary font-bold mb-1';

/** Reusable CV preview (specialist self-view and organization-facing view). */
export function CVPreviewModal({ open, onClose, data, asOrganization = false }: CVPreviewModalProps) {
  const rawId = data.nationalId ?? '';
  const displayId =
    asOrganization && rawId.length >= 10
      ? maskNationalIdForOrganization(rawId)
      : rawId || '-';

  // User-controlled links: only http(s) values are rendered as links.
  const profileUrl = safeImageUrl(data.profilePic);
  const portfolioUrl = safeExternalUrl(data.portfolio);
  const resumeUrl = safeDownloadUrl(data.resumeFile);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="السيرة الذاتية"
      icon="assignment_ind"
      panelClassName="bg-surface rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden p-6 relative"
      headerClassName="flex justify-between items-center mb-6 border-b pb-3"
    >
      <div className="overflow-y-auto pr-2 space-y-4">
        <div className="flex items-center gap-4 bg-primary/5 p-4 rounded-xl border border-primary/10">
          {profileUrl ? (
            <img
              src={profileUrl}
              alt="الصورة الشخصية"
              className="w-16 h-16 rounded-full object-cover border border-primary/20"
            />
          ) : null}
          <div>
            <h4 className="font-bold text-lg text-primary">{data.fullName || 'بدون اسم'}</h4>
            <p className="text-sm text-secondary">{data.edu || 'لم يحدد التخصص'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className={CARD}>
            <span className={LABEL}>رقم الهوية</span>
            <span className="font-medium font-mono text-slate-700">{displayId}</span>
          </div>
          <div className={CARD}>
            <span className={LABEL}>رقم الترخيص</span>
            <span className="font-medium font-mono text-slate-700">
              {data.license || 'لا يوجد'}
            </span>
          </div>
          <div className={CARD}>
            <span className={LABEL}>البريد الإلكتروني</span>
            <span className="font-medium text-slate-700 text-left" dir="ltr">
              {data.email || '-'}
            </span>
          </div>
          <div className={CARD}>
            <span className={LABEL}>رقم الجوال</span>
            <span className="font-medium font-mono text-slate-700 text-left" dir="ltr">
              {data.phone || '-'}
            </span>
          </div>
          <div className="bg-white p-3 rounded-xl border col-span-2 flex justify-between items-center">
            <span className="text-[11px] text-secondary font-bold">الخبرة</span>
            <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-xs">
              {formatExperienceYears(data.years)}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border">
          <h5 className="text-xs font-bold text-secondary mb-2">نبذة وخبرات مفصلة</h5>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {data.exp || 'لا توجد خبرات مفصلة.'}
          </p>
        </div>

        {data.portfolio ? (
          <div className="bg-white p-4 rounded-xl border flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">link</span>
            {portfolioUrl ? (
              <a
                href={portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm truncate"
                dir="ltr"
              >
                {data.portfolio}
              </a>
            ) : (
              // Legacy / unsafe value (e.g. javascript:) — inert text, never a link.
              <span className="text-secondary text-sm truncate" dir="ltr">
                {data.portfolio}
              </span>
            )}
          </div>
        ) : null}

        {data.resumeFile ? (
          <div className="bg-primary/10 p-4 rounded-xl border border-primary/20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary font-bold">
              <span className="material-symbols-outlined">picture_as_pdf</span> ملف السيرة المرفق
            </div>
            {resumeUrl ? (
              <a
                href={resumeUrl}
                download="CV.pdf"
                className="bg-white text-primary text-xs px-3 py-1.5 rounded-lg border hover:bg-surface transition-colors font-bold"
              >
                تحميل
              </a>
            ) : (
              // Legacy / unsafe value — inert text, never a link.
              <span className="text-secondary text-xs font-bold truncate max-w-[12rem]" dir="ltr">
                {data.resumeFile}
              </span>
            )}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}