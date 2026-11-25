import type { Metadata } from 'next';

import { attachmentsFor } from '@/features/documents/attachments';
import { RegistrationDetails } from '@/features/profile/RegistrationDetails';
import { CVEditor } from '@/features/specialists/cv/CVEditor';
import { requireWorkspacePage } from '@/lib/auth/policies';
import { formatDateAr } from '@/lib/format';

export const metadata: Metadata = { title: 'السيرة الذاتية' };

/**
 * The specialist's own CV — the canonical landing page for pending (and
 * rejected) specialists after signup/login. Editing, printing and the
 * registration record are all available regardless of approval.
 */
export default async function SpecialistCvPage() {
  const { profile } = await requireWorkspacePage('spec', 'any', '/specialist/cv');
  const attachments = await attachmentsFor([
    { id: profile.licenseDocId, label: 'الترخيص المهني' },
    { id: profile.resumeFileId, label: 'ملف السيرة الذاتية' },
  ]);

  return (
    <div className="space-y-8">
      <CVEditor specialist={profile} />
      <RegistrationDetails
        status={profile.status}
        items={[
          { label: 'الاسم المسجّل', value: profile.fullName },
          { label: 'رقم الهوية', value: <span className="font-mono">{profile.nationalId}</span> },
          { label: 'رقم الترخيص / المعاملة', value: <span className="font-mono">{profile.license}</span> },
          { label: 'تاريخ إصدار الترخيص', value: profile.issueDate || '-' },
          { label: 'رقم الجوال', value: <span dir="ltr">{profile.phone}</span> },
          { label: 'تاريخ التسجيل', value: formatDateAr(profile.createdAt) },
        ]}
        attachments={attachments}
        emptyAttachments="لا توجد مرفقات بعد."
      />
    </div>
  );
}
