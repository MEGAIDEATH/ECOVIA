'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { AuthShell } from '@/components/layout/AuthShell';
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

  const phoneNumber = role === 'spec' ? draft.phone.trim() : '';
  const email = role === 'spec' ? '' : `org_${draft.crNumber}@ecovia.local`;

  const backHref =
    role === 'spec' ? '/register/specialist' : '/register/organization';

  const sendOtp = useCallback(async () => {
    if (role === 'spec') {
      if (!phoneNumber) {
        setOtpState('failed');
        return;
      }
    } else if (!email || !email.includes('@')) {
      setOtpState('failed');
      return;
    }

    const res = await fetch(role === 'spec' ? '/api/session/phone-otp' : '/api/session/otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(role === 'spec' ? { phoneNumber } : { email }),
    }).catch((error: unknown) => {
      console.error('[registration] OTP request failed:', error);
      return null;
    });

    if (res?.ok) {
      setOtpState('sent');
    } else {
      let message = 'تعذر إرسال الرمز، حاول مرة أخرى.';
      if (res) {
        try {
          const body = await res.json();
          if (body?.error) message = body.error as string;
        } catch {
          // Non-JSON or empty body — use generic message
        }
        console.error(`[registration] OTP request failed: ${res.status}`);
      }
      showToast(message, true);
      setOtpState('failed');
    }
  }, [email, phoneNumber, role, showToast]);

  // The code must exist server-side before it can be verified — request it as
  // soon as the step opens (and again via the retry button on failure).
  useEffect(() => {
    // `sendOtp` awaits the network before any setState, so nothing is set
    // synchronously during this commit.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setState runs only after `await fetch`
    void sendOtp();
  }, [sendOtp]);

  const finish = async (result: RegistrationResult, rolePath: UserRole) => {
    setPreferredRole(rolePath);

    let hasPassword = false;
    try {
      const statusRes = await fetch('/api/account/password-status');
      const statusData = statusRes.ok ? await statusRes.json().catch(() => null) : null;
      hasPassword = Boolean(statusData?.hasPassword);
    } catch {
      hasPassword = false;
    }

    if (!hasPassword) {
      if (result.accountStatus === 'approved') {
        showToast('تم التفعيل!');
      }
      if (result.status === 'existing' && result.accountStatus !== 'approved') {
        showToast('هذا الحساب مسجل مسبقاً، سيتم فتح حالة التحقق الحالية.');
      }
      const next = result.accountStatus === 'approved'
        ? (rolePath === 'spec' ? '/specialist' : '/organization')
        : `/waiting?role=${rolePath}`;
      router.replace(`/set-password?next=${encodeURIComponent(next)}`);
      return;
    }

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
      const verifyRes = await fetch(role === 'spec' ? '/api/session/phone-verify' : '/api/session/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          role === 'spec'
            ? { phoneNumber, code: parsed.data.code }
            : { email, code: parsed.data.code },
        ),
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

  const showDevHint =
    process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ALLOW_DEV_OTP === 'true';

  return (
    <AuthShell
      backHref={backHref}
      title="أدخل رمز التحقق"
      subtitle={
        <>
          <span className="mb-1 block text-sm font-bold text-secondary">رمز الدخول الآمن</span>
          تم إرسال رمز تحقق (مكون من 6 أرقام) إلى الجوال المسجل.
        </>
      }
      icon="mark_email_unread"
    >
      <div className="mb-6 space-y-2 text-sm">
        {showDevHint && <p className="badge badge-brand">للتجربة: استخدم 123456</p>}
        {otpState === 'sending' && (
          <p role="status" className="text-muted">
            جاري إرسال الرمز...
          </p>
        )}
        {otpState === 'failed' && (
          <div className="alert alert-danger items-center justify-between">
            <span>تعذر إرسال الرمز.</span>
            <button
              type="button"
              onClick={() => {
                setOtpState('sending');
                void sendOtp();
              }}
              className="btn btn-danger-outline btn-sm"
            >
              إعادة المحاولة
            </button>
          </div>
        )}
        {role === 'spec' && !draft.phone && (
          <p className="field-error">
            رقم الجوال مطلوب لإتمام التسجيل.
          </p>
        )}
      </div>
      <form
        className="flex flex-col items-center"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <OtpInput value={code} onChange={setCode} disabled={loading} />
        <LoadingButton type="submit" loading={loading} loadingLabel="جاري..." showSpinner className="btn btn-primary btn-block btn-lg">
          تأكيد الدخول
        </LoadingButton>
      </form>
    </AuthShell>
  );
}
