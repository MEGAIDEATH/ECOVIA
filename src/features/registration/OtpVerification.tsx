'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { LoadingButton } from '@/components/ui/LoadingButton';
import { useToast } from '@/components/ui/Toast';
import { otpSchema } from '@/lib/validation/registration';
import { uploadDocumentForOCR } from '@/features/storage/storageService';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  registerOrganization,
  registerSpecialist,
  type RegistrationResult,
} from '@/features/registration/registrationService';
import { setPreferredRole } from '@/features/auth/preferredRole';
import { documentIdFromUrl } from '@/lib/utils/cv';
import type { UserRole } from '@/types';

import { OtpInput, OTP_LENGTH } from './OtpInput';
import { RegistrationHeader } from './RegistrationHeader';
import { useRegistrationDraft } from './RegistrationProvider';

interface OtpVerificationProps {
  role: UserRole;
}

/** Status of the one-time code request to /api/session/otp. */
type OtpRequestState = 'sending' | 'sent' | 'failed';

/**
 * OTP verification step:
 * 1. Requests a code with the server (/api/session/otp), which stores it in
 *    PostgreSQL through Better Auth (dev code is 123456)
 * 2. Verifies the code (/api/session/verify), establishing the Better Auth session
 * 3. Uploads attached document (if any) to /api/files
 * 4. Registers specialist/organization in PostgreSQL
 */
export function OtpVerification({ role }: OtpVerificationProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpState, setOtpState] = useState<OtpRequestState>('sending');
  const { draft } = useRegistrationDraft();
  const { refresh } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const email = role === 'spec' ? draft.email : `org_${draft.crNumber}@ecovia.local`;

  const backHref =
    role === 'spec' ? '/register/specialist/step-2' : '/register/organization';

  const sendOtp = useCallback(async () => {
    const res = await fetch('/api/session/otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).catch((error: unknown) => {
      console.error('[registration] OTP request failed:', error);
      return null;
    });

    if (res?.ok) {
      setOtpState('sent');
    } else {
      if (res) console.error('[registration] OTP request failed:', res.status);
      setOtpState('failed');
    }
  }, [email]);

  // The code must exist server-side before it can be verified — request it as
  // soon as the step opens (and again via the retry button on failure).
  useEffect(() => {
    // `sendOtp` awaits the network before any setState, so nothing is set
    // synchronously during this commit.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setState runs only after `await fetch`
    void sendOtp();
  }, [sendOtp]);

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
    file: File | null,
    kind: 'license' | 'commercial',
  ): Promise<string | null> => {
    if (!file) return null;
    try {
      return await uploadDocumentForOCR(file, kind).promise;
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
      // 1. Verify code and create session in PostgreSQL
      const verifyRes = await fetch('/api/session/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: parsed.data.code }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json().catch(() => null);
        showToast(data?.error || 'رمز التحقق غير صحيح!', true);
        return;
      }

      await refresh();

      // 2. Register role profile
      if (role === 'spec') {
        const licenseDocUrl = await uploadOptionalDoc(draft.licenseFile, 'license');
        const result = await registerSpecialist({
          fullName: draft.fullName,
          nationalId: draft.nationalId,
          email: draft.email,
          phone: draft.phone,
          license: draft.license,
          issueDate: draft.issueDate || null,
          licenseDocId: documentIdFromUrl(licenseDocUrl),
        });
        finish(result, 'spec');
      } else {
        const crDocUrl = await uploadOptionalDoc(draft.crFile, 'commercial');
        const result = await registerOrganization({
          orgName: draft.orgName,
          crNumber: draft.crNumber,
          phone: draft.orgPhone,
          orgDesc: draft.orgDesc,
          crDocId: documentIdFromUrl(crDocUrl),
        });
        finish(result, 'org');
      }
    } catch (error) {
      console.error('[registration] OTP submit failed:', error);
      showToast('تعذر إتمام التسجيل، حاول مرة أخرى.', true);
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
          {(process.env.NODE_ENV !== 'production' ||
            process.env.NEXT_PUBLIC_ALLOW_DEV_OTP === 'true') && (
            <span className="text-primary font-bold text-xs mt-1 inline-block">
              للتجربة: استخدم 123456
            </span>
          )}
          {otpState === 'sending' && (
            <span className="text-secondary/70 text-xs mt-2 block">جاري إرسال الرمز...</span>
          )}
          {otpState === 'failed' && (
            <button
              type="button"
              onClick={() => {
                setOtpState('sending');
                void sendOtp();
              }}
              className="text-primary font-bold text-xs mt-2 underline"
            >
              تعذر إرسال الرمز — إعادة المحاولة
            </button>
          )}
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
