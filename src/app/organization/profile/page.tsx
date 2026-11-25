import type { Metadata } from 'next';

import { PageHeader } from '@/components/ui/PageHeader';
import { attachmentsFor } from '@/features/documents/attachments';
import { FacilityProfileForm } from '@/features/organizations/profile/FacilityProfileForm';
import { RegistrationDetails } from '@/features/profile/RegistrationDetails';
import { requireWorkspacePage } from '@/lib/auth/policies';
import { formatDateAr } from '@/lib/format';
import { updateOrganizationProfileAction } from '@/server/actions/profile';

export const metadata: Metadata = { title: 'ملف المنشأة' };

/**
 * Facility profile (also the landing page of a pending facility): editable
 * public profile + the complete registration record and its attachments.
 */
export default async function OrganizationProfilePage() {
  const { profile } = await requireWorkspacePage('org', 'any', '/organization/profile');
  const attachments = await attachmentsFor([{ id: profile.crDocId, label: 'السجل التجاري' }]);

  return (
    <div className="fade-up">
      <PageHeader
        title="ملف المنشأة"
        description="يظهر الشعار ومجالات العمل والنبذة للأخصائيين على طلباتك. أبقِها محدثة."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <FacilityProfileForm
            action={updateOrganizationProfileAction}
            initial={{
              orgName: profile.orgName,
              phone: profile.phone,
              orgDesc: profile.orgDesc,
              businessFields: profile.businessFields ?? [],
              website: profile.website ?? '',
              profileImageId: profile.profileImageId ?? null,
            }}
          />
        </div>
        <div className="lg:col-span-2">
          <RegistrationDetails
            status={profile.status}
            items={[
              { label: 'اسم المنشأة', value: profile.orgName },
              { label: 'رقم السجل التجاري', value: <span className="font-mono">{profile.crNumber}</span> },
              { label: 'رقم التواصل', value: <span dir="ltr">{profile.phone}</span> },
              { label: 'تاريخ التسجيل', value: formatDateAr(profile.createdAt) },
            ]}
            attachments={attachments}
            emptyAttachments="لم تُرفق نسخة السجل التجاري عند التسجيل."
          />
        </div>
      </div>
    </div>
  );
}
