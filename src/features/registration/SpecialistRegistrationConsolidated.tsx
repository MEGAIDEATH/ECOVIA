'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { AuthShell } from '@/components/layout/AuthShell';
import { Field, describedBy } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { specialistRegistrationPayloadSchema, type SpecialistRegistrationPayload } from '@/lib/validation/registration';
import { ScanCancelledError, scanDocument } from '@/features/ocr/scanDocument';

import { DocumentUploadCard } from './DocumentUploadCard';
import { useRegistrationDraft } from './RegistrationProvider';

export function SpecialistRegistrationConsolidated() {
  const router = useRouter();
  const { draft, update } = useRegistrationDraft();
  const { showToast } = useToast();
  const [scanning, setScanning] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    // Abandon an in-flight OCR scan when leaving the page (reset first for
    // React Strict Mode's mount → cleanup → mount cycle).
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<SpecialistRegistrationPayload>({
    resolver: zodResolver(specialistRegistrationPayloadSchema),
    defaultValues: {
      fullName: draft.fullName,
      nationalId: draft.nationalId,
      phone: draft.phone,
      license: draft.license,
      issueDate: draft.issueDate || undefined,
      licenseDocId: null,
    },
  });

  const onSubmit = handleSubmit((values) => {
    update({
      fullName: values.fullName,
      nationalId: values.nationalId,
      phone: values.phone,
      license: values.license,
      issueDate: values.issueDate || undefined,
    });
    router.push('/register/specialist/verify');
  });

  const handleScan = useCallback(async (file: File) => {
    if (!file) return;
    setScanning(true);
    try {
      // License first: its text layer is cheap and fills the license fields
      // right away. The personal pass may fall back to full Arabic OCR, so it
      // must not hold the license result back.
      const licenseResult = await scanDocument(file, 'license', {
        isCancelled: () => cancelledRef.current,
      });
      if (licenseResult.license) setValue('license', licenseResult.license);
      if (licenseResult.issueDate) setValue('issueDate', licenseResult.issueDate);

      const personalResult = await scanDocument(file, 'personal', {
        isCancelled: () => cancelledRef.current,
      });
      if (personalResult.name) setValue('fullName', personalResult.name);
      if (personalResult.nationalId) setValue('nationalId', personalResult.nationalId);
      if (personalResult.phone) setValue('phone', personalResult.phone);

      update({ licenseFile: file });

      const extractedAny = Boolean(
        personalResult.name ||
          personalResult.nationalId ||
          personalResult.phone ||
          licenseResult.license ||
          licenseResult.issueDate,
      );
      if (extractedAny) {
        showToast('تم استخراج البيانات من الملف بنجاح! يرجى مراجعتها وتعديلها.');
      } else {
        showToast('لم يتم استخراج بيانات من الملف، يرجى إدخالها يدوياً.', true);
      }
    } catch (error) {
      if (error instanceof ScanCancelledError) return;
      console.error('[scan] consolidated scan failed:', error);
      showToast('تعذر قراءة الملف، يرجى إدخال البيانات يدوياً.', true);
    } finally {
      setScanning(false);
    }
  }, [setValue, showToast, update]);

  return (
    <AuthShell
      backHref="/choose-role"
      title="تسجيل أخصائي"
      subtitle="المعلومات الشخصية والترخيص المهني"
      width="md"
    >
      <form noValidate onSubmit={onSubmit} className="space-y-5">
        {/* Single PDF upload — processed once for both personal and license extraction. */}
        <DocumentUploadCard
          inputId="license_upload"
          icon="document_scanner"
          title="ارفع المستند الشخصي والترخيص"
          description="قم برفع PDF واحد يحتوي على بياناتك الشخصية والترخيص المهني. سيقوم النظام باستخراج البيانات تلقائياً."
          scanning={scanning}
          scanningMessage="جاري فحص المستند واستخراج البيانات..."
          onFile={handleScan}
          attachedFileName={draft.licenseFile?.name ?? null}
        />

        <Field id="full_name" label="الاسم الثلاثي" required error={errors.fullName?.message}>
          <input
            id="full_name"
            type="text"
            {...register('fullName')}
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={describedBy('full_name', { error: errors.fullName })}
            className="field-input"
            placeholder="الاسم الثلاثي"
          />
        </Field>

        <Field id="national_id" label="رقم الهوية" required error={errors.nationalId?.message}>
          <input
            id="national_id"
            type="number"
            {...register('nationalId')}
            aria-invalid={Boolean(errors.nationalId)}
            aria-describedby={describedBy('national_id', { error: errors.nationalId })}
            className="field-input"
            placeholder="رقم الهوية الوطنية"
          />
        </Field>

        <Field id="phone" label="رقم الجوال" required error={errors.phone?.message}>
          <input
            id="phone"
            type="number"
            dir="ltr"
            {...register('phone')}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={describedBy('phone', { error: errors.phone })}
            className="field-input text-left"
            placeholder="05XXXXXXXX"
          />
        </Field>

        <Field id="license" label="رقم المعاملة / الترخيص" required error={errors.license?.message}>
          <input
            id="license"
            type="text"
            {...register('license')}
            aria-invalid={Boolean(errors.license)}
            aria-describedby={describedBy('license', { error: errors.license })}
            className="field-input"
            placeholder="مثال: ELESL-2023-XXXX"
          />
        </Field>

        <Field id="issue_date" label="تاريخ الإصدار" error={errors.issueDate?.message}>
          <input
            id="issue_date"
            type="date"
            {...register('issueDate')}
            aria-invalid={Boolean(errors.issueDate)}
            aria-describedby={describedBy('issue_date', { error: errors.issueDate })}
            className="field-input"
          />
        </Field>

        <button type="submit" className="btn btn-primary btn-block btn-lg mt-2">
          إرسال طلب التسجيل
          <span aria-hidden="true" className="material-symbols-outlined">arrow_back</span>
        </button>
      </form>
    </AuthShell>
  );
}
