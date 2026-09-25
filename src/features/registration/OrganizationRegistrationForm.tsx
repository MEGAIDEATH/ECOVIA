'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { useToast } from '@/components/ui/Toast';
import {
  organizationRegistrationSchema,
  type OrganizationRegistrationValues,
} from '@/lib/validation/registration';
import { ScanCancelledError, scanDocument } from '@/features/ocr/scanDocument';
import { getCrLookupService } from '@/features/organizations/crLookupService';

import { DocumentUploadCard } from './DocumentUploadCard';
import { RegistrationHeader } from './RegistrationHeader';
import { useRegistrationDraft } from './RegistrationProvider';

const INPUT_CLASSES =
  'w-full px-4 py-3 bg-surface-container-low rounded-xl border-2 border-transparent focus:border-primary focus:bg-white transition-all outline-none';

/** Organization registration (legacy `view-org-step1`). */
export function OrganizationRegistrationForm() {
  const router = useRouter();
  const { draft, update } = useRegistrationDraft();
  const { showToast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [fetchingCr, setFetchingCr] = useState(false);
  const [nameFetched, setNameFetched] = useState(false);
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
    getValues,
    formState: { errors },
  } = useForm<OrganizationRegistrationValues>({
    resolver: zodResolver(organizationRegistrationSchema),
    defaultValues: {
      crNumber: draft.crNumber,
      orgName: draft.orgName,
      phone: draft.orgPhone,
      orgDesc: draft.orgDesc,
    },
  });

  /** Mock CR lookup (legacy `fetchCRData`) — isolated behind crLookupService. */
  const fetchCrData = async () => {
    setFetchingCr(true);
    try {
      const crNumber = getValues('crNumber');
      const result = await getCrLookupService().lookup(crNumber);
      setValue('orgName', result.orgName);
      setValue('orgDesc', result.orgDesc);
      setNameFetched(true);
      update({ orgName: result.orgName, orgDesc: result.orgDesc });
      showToast('تم جلب بيانات السجل بنجاح!');
    } catch (error) {
      console.error('[registration] CR lookup failed:', error);
      showToast('تعذر جلب بيانات السجل، حاول مرة أخرى.', true);
    } finally {
      setFetchingCr(false);
    }
  };

  const handleScan = async (file: File) => {
    setScanning(true);
    try {
      const result = await scanDocument(file, 'commercial', {
        isCancelled: () => cancelledRef.current,
      });
      update({ crFile: file });

      if (result.crNumber) {
        setValue('crNumber', result.crNumber);
        showToast('✨ تم الاستخراج!');
        void fetchCrData();
      } else {
        showToast('لم يتم العثور على الرقم، أدخله يدوياً.', true);
      }
    } catch (error) {
      if (error instanceof ScanCancelledError) return;
      console.error('[registration] CR scan failed:', error);
      showToast('تعذر قراءة الملف، أدخل الرقم يدوياً.', true);
    } finally {
      setScanning(false);
    }
  };

  const onSubmit = handleSubmit((values) => {
    update({
      crNumber: values.crNumber,
      orgName: values.orgName,
      orgPhone: values.phone,
      orgDesc: values.orgDesc,
    });
    showToast('استخدم 123456 للتجربة');
    router.push('/register/organization/verify');
  });

  return (
    <main className="flex flex-col min-h-screen relative p-6 bg-surface">
      <RegistrationHeader backHref="/" title="تسجيل جهة" subtitle="بيانات المنشأة" />

      <div className="flex-1 flex justify-center items-start mt-4">
        <form
          noValidate
          onSubmit={onSubmit}
          className="w-full max-w-md bg-white p-6 rounded-3xl shadow-sm border border-outline-variant/30 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10 pointer-events-none" />

          <DocumentUploadCard
            inputId="org_file_upload"
            icon="storefront"
            title="إرفاق السجل التجاري"
            description="سنقوم باستخراج رقم السجل تلقائياً"
            scanning={scanning}
            scanningMessage="جاري استخراج السجل..."
            onFile={(file) => void handleScan(file)}
            attachedFileName={draft.crFile?.name ?? null}
            className="mb-6 p-6"
            titleClassName="text-primary font-bold text-sm mb-1"
            descriptionClassName="text-[11px] text-secondary"
          />

          <div className="space-y-4">
            <div>
              <label htmlFor="cr_number" className="block text-sm font-bold text-on-surface mb-1">
                رقم السجل التجاري
              </label>
              <div className="flex gap-2">
                <input
                  id="cr_number"
                  type="text"
                  {...register('crNumber')}
                  aria-invalid={Boolean(errors.crNumber)}
                  className={`${INPUT_CLASSES} flex-1`}
                  placeholder="10XXXXXXXX"
                />
                <button
                  type="button"
                  onClick={() => void fetchCrData()}
                  disabled={fetchingCr}
                  className="bg-primary/10 text-primary px-4 rounded-xl font-bold hover:bg-primary/20 transition-colors flex items-center gap-1 border border-primary/20 whitespace-nowrap disabled:opacity-70"
                >
                  <span
                    className={`material-symbols-outlined text-lg ${fetchingCr ? 'animate-spin' : ''}`}
                  >
                    sync
                  </span>{' '}
                  جلب
                </button>
              </div>
              {errors.crNumber && (
                <p role="alert" className="mt-1 text-xs font-bold text-red-500">
                  {errors.crNumber.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="org_name" className="block text-sm font-bold text-on-surface mb-1">
                اسم المنشأة
              </label>
              <input
                id="org_name"
                type="text"
                readOnly
                {...register('orgName')}
                aria-invalid={Boolean(errors.orgName)}
                className={`w-full px-4 py-3 rounded-xl border-2 border-transparent outline-none ${
                  nameFetched
                    ? 'bg-white'
                    : 'bg-surface-container-low cursor-not-allowed text-secondary'
                }`}
                placeholder="يتم جلبه تلقائياً"
              />
              {errors.orgName && (
                <p role="alert" className="mt-1 text-xs font-bold text-red-500">
                  {errors.orgName.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="org_phone" className="block text-sm font-bold text-on-surface mb-1">
                رقم التواصل
              </label>
              <input
                id="org_phone"
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

            <div>
              <label htmlFor="org_desc" className="block text-sm font-bold text-on-surface mb-1">
                نبذة عن الجهة
              </label>
              <textarea
                id="org_desc"
                rows={2}
                {...register('orgDesc')}
                aria-invalid={Boolean(errors.orgDesc)}
                className={`${INPUT_CLASSES} resize-none`}
                placeholder="اكتب نبذة مختصرة عن نشاط الجهة..."
              />
              {errors.orgDesc && (
                <p role="alert" className="mt-1 text-xs font-bold text-red-500">
                  {errors.orgDesc.message}
                </p>
              )}
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
