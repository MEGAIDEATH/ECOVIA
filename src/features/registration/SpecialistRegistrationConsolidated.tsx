'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { useToast } from '@/components/ui/Toast';
import { specialistRegistrationPayloadSchema, type SpecialistRegistrationPayload } from '@/lib/validation/registration';
import { ScanCancelledError, scanDocument } from '@/features/ocr/scanDocument';

import { DocumentUploadCard } from './DocumentUploadCard';
import { RegistrationHeader } from './RegistrationHeader';
import { useRegistrationDraft } from './RegistrationProvider';

const INPUT_CLASSES =
  'w-full px-4 py-3 bg-surface-container-low rounded-xl border-2 border-transparent focus:border-primary focus:bg-white transition-all outline-none';

export function SpecialistRegistrationConsolidated() {
  const router = useRouter();
  const { draft, update } = useRegistrationDraft();
  const { showToast } = useToast();
  const [scanning, setScanning] = useState(false);
  const cancelledRef = useRef(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<SpecialistRegistrationPayload>({
    resolver: zodResolver(specialistRegistrationPayloadSchema),
    defaultValues: {
      fullName: draft.fullName,
      nationalId: draft.nationalId,
      email: draft.email,
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
      email: values.email,
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
      const personalResult = await scanDocument(file, 'personal', {
        isCancelled: () => cancelledRef.current,
      });
      if (personalResult.name) setValue('fullName', personalResult.name);
      if (personalResult.nationalId) setValue('nationalId', personalResult.nationalId);
      if (personalResult.phone) setValue('phone', personalResult.phone);

      const licenseResult = await scanDocument(file, 'license', {
        isCancelled: () => cancelledRef.current,
      });
      if (licenseResult.license) setValue('license', licenseResult.license);
      if (licenseResult.issueDate) setValue('issueDate', licenseResult.issueDate);

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
  }, [setValue, showToast, update]);  return (
    <main className="flex flex-col min-h-screen relative p-6 bg-surface">
      <RegistrationHeader
        backHref="/"
        title="تسجيل أخصائي"
        subtitle="المعلومات الشخصية والترخيص المهني"
      />
      <div className="flex-1 flex flex-col justify-center items-start px-4 max-w-2xl w-full">
        <form noValidate onSubmit={onSubmit} className="w-full space-y-6">

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
            className="mb-4 p-8 bg-surface-container-lowest"
            iconContainerClassName="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm"
            titleClassName="text-primary font-bold text-lg mb-1"
            descriptionClassName="text-xs text-secondary max-w-none leading-relaxed"
          />

          {draft.licenseFile && (
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
              <p className="text-xs font-bold text-primary mb-2">الملف المرفوع:</p>
              <p className="text-sm text-secondary break-all">{draft.licenseFile.name}</p>
            </div>
          )}
          {/* Personal information — vertical stack, one field per row. */}
          <div className="space-y-4">
            <label htmlFor="full_name" className="block text-sm font-bold text-on-surface mb-1">
              الاسم الثلاثي <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="full_name"
                type="text"
                {...register('fullName')}
                aria-invalid={Boolean(errors.fullName)}
                className={INPUT_CLASSES}
                placeholder="الاسم الثلاثي"
              />
            </div>
            {errors.fullName && (
              <p role="alert" className="mt-1 text-xs font-bold text-red-500">
                {errors.fullName.message}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <label htmlFor="national_id" className="block text-sm font-bold text-on-surface mb-1">
              رقم الهوية <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="national_id"
                type="number"
                {...register('nationalId')}
                aria-invalid={Boolean(errors.nationalId)}
                className={INPUT_CLASSES}
                placeholder="رقم الهوية الوطنية"
              />
            </div>
            {errors.nationalId && (
              <p role="alert" className="mt-1 text-xs font-bold text-red-500">
                {errors.nationalId.message}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <label htmlFor="email" className="block text-sm font-bold text-on-surface mb-1">
              البريد الإلكتروني <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              dir="ltr"
              {...register('email')}
              aria-invalid={Boolean(errors.email)}
              className={`${INPUT_CLASSES} text-left`}
              placeholder="example@email.com"
            />
            {errors.email && (
              <p role="alert" className="mt-1 text-xs font-bold text-red-500">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <label htmlFor="phone" className="block text-sm font-bold text-on-surface mb-1">
              رقم الجوال <span className="text-red-500">*</span>
            </label>
            <input
              id="phone"
              type="number"
              dir="ltr"
              {...register('phone')}
              aria-invalid={Boolean(errors.phone)}
              className={`${INPUT_CLASSES} text-left`}
              placeholder="05XXXXXXXX"
            />
            {errors.phone && (
              <p role="alert" className="mt-1 text-xs font-bold text-red-500">
                {errors.phone.message}
              </p>
            )}
          </div>

          {/* License information — vertical stack, one field per row. */}
          <div className="space-y-4">
            <label htmlFor="license" className="block text-sm font-bold text-on-surface mb-1">
              رقم المعاملة / الترخيص <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="license"
                type="text"
                {...register('license')}
                aria-invalid={Boolean(errors.license)}
                className={INPUT_CLASSES}
                placeholder="مثال: ELESL-2023-XXXX"
              />
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-primary/50">
                verified
              </span>
            </div>
            {errors.license && (
              <p role="alert" className="mt-1 text-xs font-bold text-red-500">
                {errors.license.message}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <label htmlFor="issue_date" className="block text-sm font-bold text-on-surface mb-1">
              تاريخ الإصدار
            </label>
            <input
              id="issue_date"
              type="date"
              {...register('issueDate')}
              className={INPUT_CLASSES}
            />
          </div>

          <button
            type="submit"
            className="w-full mt-6 py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-[#006d44] transition-colors shadow-md flex justify-center items-center gap-2"
          >
            إرسال طلب التسجيل <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </form>
      </div>
    </main>
  );
}