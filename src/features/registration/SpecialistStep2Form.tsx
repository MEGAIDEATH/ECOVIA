'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { useToast } from '@/components/ui/Toast';
import { specialistStep2Schema, type SpecialistStep2Values } from '@/lib/validation/registration';
import { ScanCancelledError, scanDocument } from '@/features/ocr/scanDocument';

import { DocumentUploadCard } from './DocumentUploadCard';
import { RegistrationHeader } from './RegistrationHeader';
import { RegistrationStepper } from './RegistrationStepper';
import { useRegistrationDraft } from './RegistrationProvider';

const INPUT_CLASSES =
  'w-full px-4 py-3 bg-surface-container-low rounded-xl border-2 border-transparent focus:border-primary focus:bg-white transition-all outline-none';

/** Specialist registration — step 2: environmental license + automatic scanner. */
export function SpecialistStep2Form() {
  const router = useRouter();
  const { draft, update } = useRegistrationDraft();
  const { showToast } = useToast();
  const [scanning, setScanning] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SpecialistStep2Values>({
    resolver: zodResolver(specialistStep2Schema),
    defaultValues: {
      license: draft.license,
      issueDate: draft.issueDate,
    },
  });

  const onSubmit = handleSubmit((values) => {
    update({ license: values.license, issueDate: values.issueDate ?? '' });
    showToast('استخدم 123456 للتجربة');
    router.push('/register/specialist/verify');
  });

  const handleScan = async (file: File) => {
    setScanning(true);
    try {
      const result = await scanDocument(file, 'license', {
        isCancelled: () => cancelledRef.current,
      });
      update({ licenseFile: file });

      if (result.license) {
        setValue('license', result.license);
        if (result.issueDate) setValue('issueDate', result.issueDate);
        showToast('✨ تم الاستخراج بنجاح!');
      } else {
        showToast('لم يتم العثور على الرقم، أدخله يدوياً.', true);
      }
    } catch (error) {
      if (error instanceof ScanCancelledError) return;
      console.error('[scan] license scan failed:', error);
      showToast('تعذر قراءة الملف، أدخل الرقم يدوياً.', true);
    } finally {
      setScanning(false);
    }
  };

  return (
    <main className="flex flex-col min-h-screen relative p-6 bg-surface">
      <RegistrationHeader
        backHref="/register/specialist/step-1"
        title="تسجيل أخصائي"
        subtitle="الترخيص المهني"
      />
      <RegistrationStepper current={2} />

      <div className="flex-1 flex justify-center items-start">
        <form
          noValidate
          onSubmit={onSubmit}
          className="w-full max-w-md bg-white p-6 rounded-3xl shadow-sm border border-outline-variant/30"
        >
          <DocumentUploadCard
            inputId="file_upload"
            icon="upload_file"
            title="ارفع الترخيص البيئي"
            description="قم برفع صورة أو PDF للترخيص وسيقوم الذكاء الاصطناعي باستخراج البيانات."
            scanning={scanning}
            scanningMessage="جاري فحص الترخيص واستخراج رقم المعاملة..."
            onFile={(file) => void handleScan(file)}
            attachedFileName={draft.licenseFile?.name ?? null}
            className="mb-6 p-8"
            iconContainerClassName="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm"
            titleClassName="text-primary font-bold text-lg mb-1"
            descriptionClassName="text-xs text-secondary max-w-[200px] leading-relaxed"
          />

          <div className="space-y-4">
            <div>
              <label htmlFor="license" className="block text-sm font-bold text-on-surface mb-1">
                رقم المعاملة / الترخيص
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

            <div>
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
          </div>

          <button
            type="submit"
            className="w-full mt-8 py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-[#006d44] transition-colors shadow-md flex justify-center items-center gap-2"
          >
            المتابعة للتحقق <span className="material-symbols-outlined">arrow_back</span>
          </button>
        </form>
      </div>
    </main>
  );
}