import { Avatar } from '@/components/ui/Avatar';
import { safeExternalUrl } from '@/lib/utils/url';
import type { Organization } from '@/types';

import { AttachmentList, type Attachment } from '@/features/documents/AttachmentList';

/**
 * Facility profile as a specialist sees it on a request: logo, name, fields
 * of business, description, website. Registration details (CR number and the
 * commercial-registration file) appear only when the workflow allows it.
 */
export function FacilityCard({
  organization,
  registration,
}: {
  organization: Pick<Organization, 'orgName' | 'profileImageId' | 'businessFields' | 'orgDesc' | 'website' | 'crNumber'>;
  registration: { visible: boolean; attachments: Attachment[] };
}) {
  const website = safeExternalUrl(organization.website);
  return (
    <section aria-labelledby="facility-heading" className="card p-5 md:p-6">
      <div className="flex items-start gap-4">
        <Avatar name={organization.orgName} imageId={organization.profileImageId} size="md" shape="square" />
        <div className="min-w-0 flex-1">
          <h3 id="facility-heading" className="text-lg font-bold text-forest">
            {organization.orgName}
          </h3>
          {organization.businessFields && organization.businessFields.length > 0 && (
            <ul className="mt-1 flex flex-wrap gap-1.5" aria-label="مجالات العمل">
              {organization.businessFields.map((field) => (
                <li key={field} className="badge badge-neutral">
                  {field}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {organization.orgDesc && <p className="mt-4 text-sm leading-relaxed whitespace-pre-wrap text-on-surface">{organization.orgDesc}</p>}
      {website && (
        <a href={website} target="_blank" rel="noopener noreferrer" dir="ltr" className="mt-3 inline-block text-sm font-semibold text-secondary">
          {organization.website}
        </a>
      )}
      <div className="mt-4 border-t border-line pt-4">
        <h4 className="mb-2 text-sm font-bold text-forest">بيانات التسجيل</h4>
        {registration.visible ? (
          <>
            <p className="mb-3 text-sm">
              رقم السجل التجاري: <span className="font-mono font-bold">{organization.crNumber}</span>
            </p>
            <AttachmentList attachments={registration.attachments} empty="لم ترفق المنشأة نسخة السجل التجاري." />
          </>
        ) : (
          <p className="text-sm text-muted">تظهر بيانات السجل التجاري بعد تقديم عرض على هذا الطلب.</p>
        )}
      </div>
    </section>
  );
}
