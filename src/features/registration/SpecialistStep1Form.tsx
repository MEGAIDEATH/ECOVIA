'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { useToast } from '@/components/ui/Toast';
import { specialistStep1Schema, type SpecialistStep1Values } from '@/lib/validation/registration';
import { ScanCancelledError, scanDocument } from '@/features/ocr/scanDocument';

import { DocumentUploadCard } from './DocumentUploadCard';
import { RegistrationHeader } from './RegistrationHeader';
import { RegistrationStepper } from './RegistrationStepper';
import { useRegistrationDraft } from './RegistrationProvider';

const INPUT_CLASSES =
  'w-full px-4 py-3 bg-surface-container-low rounded-xl border-2 border-transparent focus:border-primary focus:bg-white transition-all outline-none';

/** Specialist registration — step 1: personal information + automatic scanner. */
export function SpecialistStep1Form() {
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
  } = useForm<SpecialistStep1Values>({
    resolver: zodResolver(specialistStep1Schema),
    defaultValues: {
      fullName: draft.fullName,
      nationalId: draft.nationalId,
      email: draft.email,
      phone: draft.phone,
    },
  });

  const onSubmit = handleSubmit((values) => {
    update({
      fullName: values.fullName,
      nationalId: values.nationalId,
      email: values.email,
      phone: values.phone,
    });
    router.push('/register/specialist/step-2');
  });

  const handleScan = async (file: File) => {
    setScanning(true);
    try {
      const result = await scanDocument(file, 'personal', {
        isCancelled: () => cancelledRef.current,
      });
      if (result.name) setValue('fullName', result.name);
      if (result.nationalId) setValue('nationalId', result.nationalId);
      if (result.phone) setValue('phone', result.phone);

      if (result.name || result.nationalId || result.phone) {
        showToast('✨ تمت القراءة بنجاح! يرجى التأكد من البيانات.');
      } else {
        showToast('لم يتم استخراج البيانات، أدخلها يدوياً.', true);
      }
    } catch (error) {
      if (error instanceof ScanCancelledError) return;
      console.error('[scan] personal scan failed:', error);
      showToast('تعذر قراءة الملف، أدخل البيانات يدوياً.', true);
    } finally {
      setScanning(false);
    }
  };

  return (
    <main className="flex flex-col min-h-screen relative p-6 bg-surface">
      <RegistrationHeader backHref="/" title="تسجيل أخصائي" subtitle="البيانات الشخصية" />
      <RegistrationStepper current={1} />

      <div className="flex-1 flex justify-center items-start">
        <form
          noValidate
          onSubmit={onSubmit}
          className="w-full max-w-md bg-white p-6 rounded-3xl shadow-sm border border-outline-variant/30 relative"
        >
          <DocumentUploadCard
            inputId="personal_upload"
            icon="document_scanner"
            title="القارئ الآلي للبيانات"
            description="ارفع بطاقة الهوية أو الرخصة لاستخراج البيانات تلقائياً وتوفير الوقت."
            scanning={scanning}
            scanningMessage="جاري قراءة البيانات بذكاء..."
            onFile={(file) => void handleScan(file)}
            className="mb-6 p-6 bg-surface-container-lowest"
          />

          <div className="space-y-4">
            <div>
              <label htmlFor="full_name" className="block text-sm font-bold text-on-surface mb-1">
                الاسم الثلاثي
              </label>
              <input
                id="full_name"
                type="text"
                {...register('fullName')}
                aria-invalid={Boolean(errors.fullName)}
                className={INPUT_CLASSES}
                placeholder="الاسم الثلاثي"
              />
              {errors.fullName && (
                <p role="alert" className="mt-1 text-xs font-bold text-red-500">
                  {errors.fullName.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="national_id" className="block text-sm font-bold text-on-surface mb-1">
                رقم الهوية
              </label>
              <input
                id="national_id"
                type="number"
                {...register('nationalId')}
                aria-invalid={Boolean(errors.nationalId)}
                className={INPUT_CLASSES}
                placeholder="رقم الهوية الوطنية"
              />
              {errors.nationalId && (
                <p role="alert" className="mt-1 text-xs font-bold text-red-500">
                  {errors.nationalId.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-bold text-on-surface mb-1">
                البريد الإلكتروني
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

            <div>
              <label htmlFor="phone" className="block text-sm font-bold text-on-surface mb-1">
                رقم الجوال
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
          </div>

          <button
            type="submit"
            className="w-full mt-8 py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-[#006d44] transition-colors shadow-md flex justify-center items-center gap-2"
          >
            المتابعة <span className="material-symbols-outlined">arrow_back</span>
          </button>
        </form>
      </div>
    </main>
  );
}
