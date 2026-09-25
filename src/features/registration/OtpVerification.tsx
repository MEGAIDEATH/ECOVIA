'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { LoadingButton } from '@/components/ui/LoadingButton';
import { useToast } from '@/components/ui/Toast';
import { otpSchema } from '@/lib/validation/registration';
import { ensureAnonymousAuth } from '@/lib/firebase/client';
import { uploadDocumentForOCR } from '@/features/storage/storageService';
import { useAuth } from '@/features/auth/AuthProvider';
import { InvalidOtpError, getOtpService } from '@/features/auth/otp/otpService';
import {
  registerOrganization,
  registerSpecialist,
  type RegistrationResult,
} from '@/features/registration/registrationService';
import { setPreferredRole } from '@/features/auth/preferredRole';
import type { UserRole } from '@/types';

import { OtpInput, OTP_LENGTH } from './OtpInput';
import { RegistrationHeader } from './RegistrationHeader';
import { useRegistrationDraft } from './RegistrationProvider';

interface OtpVerificationProps {
  role: UserRole;
}

/**
 * OTP verification step (demo flow: the UI tells users to type 123456).
 * Verification goes through an OTP service abstraction — the demo
 * implementation can later be swapped for real phone verification.
 */
export function OtpVerification({ role }: OtpVerificationProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { draft } = useRegistrationDraft();
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const backHref =
    role === 'spec' ? '/register/specialist/step-2' : '/register/organization';

  /**
   * Expected registration states route normally — only unexpected failures
   * reach the catch block of `submit()`:
   *   created            → waiting room (status forced to pending by rules)
   *   existing + pending → waiting room (resume current verification)
   *   existing + approved→ canonical dashboard (no duplicate document)
   */
  const finish = (result: RegistrationResult, rolePath: UserRole) => {
    setPreferredRole(rolePath);

    if (result.accountStatus === 'approved') {
      showToast('تم التفعيل!');
      router.replace(rolePath === 'spec' ? '/specialist' : '/organization');
      return;
    }

    if (result.status === 'existing') {
      showToast('هذا الحساب مسجل مسبقاً، سيتم فتح حالة التحقق الحالية.');
    }
    router.replace(`/waiting?role=${rolePath}`);
  };

  const uploadOptionalDoc = async (
    uid: string,
    file: File | null,
    kind: 'license' | 'commercial',
  ): Promise<string | null> => {
    if (!file) return null;
    try {
      return await uploadDocumentForOCR(uid, file, kind).promise;
    } catch (error) {
      console.error('[registration] document upload failed:', error);
      showToast('تعذر رفع نسخة المستند.', true);
      return null;
    }
  };

  const submit = async () => {
    const parsed = otpSchema.safeParse({ code });
    if (!parsed.success || code.length !== OTP_LENGTH) {
      showToast('أدخل رمز التحقق المكون من 6 أرقام', true);
      return;
    }

    setLoading(true);
    try {
      await getOtpService().verify(parsed.data.code);
      const uid = user?.uid ?? (await ensureAnonymousAuth()).uid;

      if (role === 'spec') {
        const licenseDocUrl = await uploadOptionalDoc(uid, draft.licenseFile, 'license');
        const result = await registerSpecialist({
          fullName: draft.fullName,
          nationalId: draft.nationalId,
          email: draft.email,
          phone: draft.phone,
          license: draft.license,
          issueDate: draft.issueDate || null,
          licenseDocUrl,
        });
        finish(result, 'spec');
      } else {
        const crDocUrl = await uploadOptionalDoc(uid, draft.crFile, 'commercial');
        const result = await registerOrganization({
          orgName: draft.orgName,
          crNumber: draft.crNumber,
          phone: draft.orgPhone,
          orgDesc: draft.orgDesc,
          crDocUrl,
        });
        finish(result, 'org');
      }
    } catch (error) {
      if (error instanceof InvalidOtpError) {
        showToast(error.message, true);
      } else {
        console.error('[registration] OTP submit failed:', error);
        showToast('تعذر إتمام التسجيل، حاول مرة أخرى.', true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col min-h-screen relative p-6 bg-surface">
      <RegistrationHeader backHref={backHref} title="التحقق" subtitle="رمز الدخول الآمن" />

      <div className="flex-1 flex flex-col justify-center items-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6 shadow-sm border border-primary/20">
          <span className="material-symbols-outlined text-4xl">mark_email_unread</span>
        </div>
        <h3 className="text-xl font-bold text-on-surface mb-2">أدخل رمز التحقق</h3>
        <p className="text-secondary text-sm mb-8 text-center max-w-xs leading-relaxed">
          تم إرسال رمز تحقق (مكون من 6 أرقام) إلى الجوال المسجل. <br />
          <span className="text-primary font-bold text-xs mt-1 inline-block">
            للتجربة: استخدم 123456
          </span>
        </p>

        <form
          className="w-full max-w-sm flex flex-col items-center"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <OtpInput value={code} onChange={setCode} disabled={loading} />
          <LoadingButton
            type="submit"
            loading={loading}
            loadingLabel="جاري..."
            className="w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-[#006d44] transition-colors shadow-md"
          >
            تأكيد الدخول
          </LoadingButton>
        </form>
      </div>
    </main>
  );
}