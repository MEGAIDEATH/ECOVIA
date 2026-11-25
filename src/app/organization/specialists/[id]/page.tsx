import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/ui/PageHeader';
import { PrintButton } from '@/components/ui/PrintButton';
import { AttachmentList } from '@/features/documents/AttachmentList';
import { attachmentsFor } from '@/features/documents/attachments';
import { ContactSpecialistButton } from '@/features/organizations/specialists/ContactSpecialistButton';
import { CVDocument } from '@/features/specialists/cv/CVDocument';
import { requireWorkspacePage } from '@/lib/auth/policies';
import { maskNationalIdForOrganization, toCvPreviewData } from '@/lib/utils/cv';
import { haveRelationship } from '@/repositories/documents';
import { getSpecialistById } from '@/repositories/profiles';

export const metadata: Metadata = { title: 'الملف المهني' };

/**
 * A specialist's professional profile as a facility sees it: the current CV
 * (national ID masked), print, contact, "send a private request", and the
 * professional permit — the permit file only once there is a business
 * relationship (offer, private request, contract or conversation).
 */
export default async function SpecialistProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { account, profile: organization } = await requireWorkspacePage('org', 'approved', `/organization/specialists/${id}`);
  const specialist = await getSpecialistById(id);
  if (!specialist || specialist.status !== 'approved' || specialist.userId === account.user.id) notFound();

  const related = await haveRelationship(organization.id, specialist.id);
  const permit = related ? await attachmentsFor([{ id: specialist.licenseDocId, label: 'الترخيص المهني' }]) : [];
  const cv = toCvPreviewData({ ...specialist, nationalId: maskNationalIdForOrganization(specialist.nationalId) });

  return (
    <div className="fade-up space-y-6">
      <PageHeader
        title={specialist.fullName}
        description={[specialist.edu || 'لم يحدد التخصص', specialist.region].filter(Boolean).join(' · ')}
        back={{ href: '/organization/specialists', label: 'دليل الكفاءات' }}
        actions={
          <>
            <PrintButton targetId="specialist-cv" label="طباعة السيرة" />
            <Link href={`/organization/requests/new?specialist=${specialist.id}`} className="btn btn-soft">
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                lock
              </span>
              إرسال طلب خاص
            </Link>
            <ContactSpecialistButton specialistUserId={specialist.userId} />
          </>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-5 md:p-7 lg:col-span-2">
          {!specialist.resumeFileId && <p className="alert alert-info mb-4">لم يرفق هذا الأخصائي ملف سيرة ذاتية بعد.</p>}
          <div id="specialist-cv">
            <CVDocument data={cv} asOrganization resumeOpen />
          </div>
        </div>
        <section aria-labelledby="permit-heading" className="card h-fit p-5">
          <h3 id="permit-heading" className="mb-2 text-base font-bold text-forest">
            الترخيص المهني
          </h3>
          <p className="mb-3 text-sm">
            رقم الترخيص: <span className="font-mono font-bold">{specialist.license}</span>
          </p>
          {related ? (
            <AttachmentList attachments={permit} empty="لم يرفق الأخصائي نسخة الترخيص." />
          ) : (
            <p className="text-sm text-muted">يظهر ملف الترخيص بعد بدء تعامل مع الأخصائي (عرض، طلب خاص، أو محادثة).</p>
          )}
        </section>
      </div>
    </div>
  );
}
