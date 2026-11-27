'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AuthShell } from '@/components/layout/AuthShell';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { useToast } from '@/components/ui/Toast';
import { uploadDocumentForOCR } from '@/features/storage/storageService';
import { documentIdFromUrl } from '@/lib/utils/cv';
import type { UserRole } from '@/types';

import { LinkingNotice } from './LinkingNotice';
import { registerOrganization, registerSpecialist } from './registrationService';
import { useRegistrationDraft } from './RegistrationProvider';

/**
 * Replaces the OTP step for a signed-in user adding a second profile: the
 * session already proves the identity. The server (`/api/register/*`) uses the
 * session user, refuses duplicates and always creates the profile as PENDING.
 */
export function LinkProfileStep({ role, accountName }: { role: UserRole; accountName: string }) {
  const { draft } = useRegistrationDraft();
  const router = useRouter();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const formHref = role === 'spec' ? '/register/specialist' : '/register/organization';
  const complete = role === 'spec' ? Boolean(draft.fullName && draft.phone && draft.license) : Boolean(draft.orgName && draft.crNumber);

  const submit = async () => {
    setSubmitting(true);
    try {
      const file = role === 'spec' ? draft.licenseFile : draft.crFile;
      const docUrl = file ? await uploadDocumentForOCR(file, role === 'spec' ? 'license' : 'commercial').promise : null;
      const docId = documentIdFromUrl(docUrl);
      const result =
        role === 'spec'
          ? await registerSpecialist({
              fullName: draft.fullName,
              nationalId: draft.nationalId,
              phone: draft.phone,
              license: draft.license,
              issueDate: draft.issueDate || null,
              licenseDocId: docId,
            })
          : await registerOrganization({
              orgName: draft.orgName,
              crNumber: draft.crNumber,
              phone: draft.orgPhone,
              orgDesc: draft.orgDesc,
              crDocId: docId,
            });
      showToast(result.status === 'existing' ? 'هذا الملف موجود مسبقاً في حسابك.' : 'تمت إضافة الملف، وهو الآن قيد المراجعة.');
      router.replace('/dashboard');
      router.refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر إضافة الملف، حاول مرة أخرى.', true);
      setSubmitting(false);
    }
  };

  return (
    <AuthShell backHref={formHref} title="تأكيد إضافة الملف" icon="person_add" notice={<LinkingNotice accountName={accountName} role={role} />}>
      {complete ? (
        <div className="space-y-4">
          <dl className="space-y-2 rounded-control bg-wash p-4 text-sm">
            {(role === 'spec'
              ? [
                  ['الاسم', draft.fullName],
                  ['رقم الجوال', draft.phone],
                  ['رقم الترخيص', draft.license],
                  ['المرفق', draft.licenseFile?.name ?? 'بدون مرفق'],
                ]
              : [
                  ['اسم المنشأة', draft.orgName],
                  ['السجل التجاري', draft.crNumber],
                  ['رقم التواصل', draft.orgPhone],
                  ['المرفق', draft.crFile?.name ?? 'بدون مرفق'],
                ]
            ).map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="font-bold text-muted">{label}</dt>
                <dd className="text-on-surface">{value}</dd>
              </div>
            ))}
          </dl>
          <LoadingButton loading={submitting} loadingLabel="جاري الإضافة..." showSpinner onClick={() => void submit()} className="btn btn-primary btn-block btn-lg">
            إضافة الملف إلى حسابي
          </LoadingButton>
        </div>
      ) : (
        <p className="text-sm">
          بيانات التسجيل غير مكتملة.{' '}
          <Link href={formHref} className="font-bold text-secondary">
            العودة إلى النموذج
          </Link>
        </p>
      )}
    </AuthShell>
  );
}
