'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { cvSchema, type CvValues } from '@/lib/validation/forms';
import { documentIdFromUrl, fileUrl } from '@/lib/utils/cv';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  uploadProfileImage,
  uploadResume,
  UploadValidationError,
} from '@/features/storage/storageService';

import { useSpecialistDashboard } from '../dashboard/SpecialistDashboardProvider';
import { updateSpecialistProfile } from '../specialistRepository';
import { printElement } from '@/lib/print';

import { CVDocument } from './CVDocument';
import { CVPreviewModal } from './CVPreviewModal';

/** Specialist CV editor (legacy `scontent-cv`). */
export function CVEditor() {
  const { specialist, refresh } = useSpecialistDashboard();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Profile photo state: instant local preview + Storage upload.
  const [picPreview, setPicPreview] = useState<string | null>(fileUrl(specialist?.profilePicId));
  const [picUrl, setPicUrl] = useState<string | null>(fileUrl(specialist?.profilePicId));
  const [picUploading, setPicUploading] = useState(false);
  const [pendingPic, setPendingPic] = useState<Promise<string> | null>(null);

  // Resume state.
  const [resumeUrl, setResumeUrl] = useState<string | null>(fileUrl(specialist?.resumeFileId));
  const [resumeName, setResumeName] = useState<string | null>(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [pendingResume, setPendingResume] = useState<Promise<string> | null>(null);

  const picInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLElement>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<CvValues>({
    resolver: zodResolver(cvSchema),
    defaultValues: {
      fullName: specialist?.fullName ?? '',
      email: specialist?.email ?? '',
      phone: specialist?.phone ?? '',
      edu: specialist?.edu ?? '',
      city: specialist?.city ?? '',
      years: specialist?.years != null ? String(specialist.years) : '',
      exp: specialist?.exp ?? '',
      portfolio: specialist?.portfolio ?? '',
    },
  });

  const handlePicChange = async (file: File) => {
    if (!user) return;
    const localUrl = URL.createObjectURL(file);
    setPicPreview(localUrl);
    setPicUploading(true);
    try {
      const handle = uploadProfileImage(file);
      setPendingPic(handle.promise);
      const url = await handle.promise;
      setPicUrl(url);
      setPicPreview(url);
      if (localUrl.startsWith('blob:')) URL.revokeObjectURL(localUrl);
    } catch (error) {
      console.error('[cv] profile image upload failed:', error);
      const message =
        error instanceof UploadValidationError ? error.message : 'تعذر رفع الصورة، حاول مرة أخرى.';
      showToast(message, true);
      setPicPreview(picUrl);
      if (localUrl.startsWith('blob:')) URL.revokeObjectURL(localUrl);
    } finally {
      setPendingPic(null);
      setPicUploading(false);
    }
  };

  const handleResumeChange = async (file: File) => {
    if (!user) return;
    setResumeName(file.name);
    setResumeUploading(true);
    try {
      const handle = uploadResume(file);
      setPendingResume(handle.promise);
      const url = await handle.promise;
      setResumeUrl(url);
    } catch (error) {
      console.error('[cv] resume upload failed:', error);
      const message =
        error instanceof UploadValidationError ? error.message : 'تعذر رفع الملف، حاول مرة أخرى.';
      showToast(message, true);
      setResumeName(null);
    } finally {
      setPendingResume(null);
      setResumeUploading(false);
    }
  };

  const onSubmit = handleSubmit(async (values: CvValues) => {
    if (!user) return;
    setSaving(true);
    try {
      // Wait for in-flight uploads so the saved profile uses final URLs.
      const [finalPic, finalResume] = await Promise.all([
        pendingPic ?? Promise.resolve(picUrl),
        pendingResume ?? Promise.resolve(resumeUrl),
      ]);

      await updateSpecialistProfile({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        edu: values.edu,
        city: values.city,
        years: values.years,
        exp: values.exp,
        portfolio: values.portfolio,
        profilePicId: documentIdFromUrl(finalPic),
        resumeFileId: documentIdFromUrl(finalResume),
      });
      setPicUrl(finalPic ?? null);
      setResumeUrl(finalResume ?? null);
      await refresh();
      showToast('تم حفظ التحديثات!');
    } catch (error) {
      console.error('[cv] save failed:', error);
      showToast('تعذر حفظ التحديثات، حاول مرة أخرى.', true);
    } finally {
      setSaving(false);
    }
  });

  const buildPreviewData = () => ({
    ...getValues(),
    profilePic: picUrl,
    resumeFile: resumeUrl,
    nationalId: specialist?.nationalId ?? '',
    license: specialist?.license ?? '',
  });

  const EDIT_INPUT = 'field-input';
  const READONLY_INPUT = 'field-input';
  const FIELD_LABEL = 'field-label';

  return (
    <div className="fade-up card relative p-5 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <h2 className="flex items-center gap-2 text-xl font-bold text-forest">
          <span aria-hidden="true" className="material-symbols-outlined text-2xl text-secondary">person_book</span> السيرة الذاتية
          الرقمية
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => printRef.current && printElement(printRef.current)}
            className="btn btn-secondary"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">print</span> طباعة السيرة
          </button>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="btn btn-secondary"
          >
            <span className="material-symbols-outlined text-[18px]">visibility</span> استعراض
          </button>
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? (
              <Spinner className="w-4 h-4 border-2 border-white/70 border-t-white" />
            ) : (
              <span className="material-symbols-outlined text-[18px]">save</span>
            )}{' '}
            حفظ
          </button>
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <button
              type="button"
              onClick={() => picInputRef.current?.click()}
              aria-label="تغيير الصورة الشخصية"
              className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-sage bg-accent-soft transition-colors hover:border-secondary"
            >
              {picPreview ? (
                <img src={picPreview} alt="الصورة الشخصية" className="size-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-3xl text-muted">
                  add_a_photo
                </span>
              )}
              {picUploading && (
                <span className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <Spinner className="w-5 h-5 border-2" />
                </span>
              )}
            </button>
            <input
              ref={picInputRef}
              id="profile_pic_upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handlePicChange(file);
                event.target.value = '';
              }}
            />
            <div>
              <p className="text-sm font-bold text-forest">الصورة الشخصية (اختياري)</p>
              <p className="text-xs text-muted mt-1">اضغط للتعديل (JPG/PNG)</p>
            </div>
          </div>

          <div>
            <label htmlFor="cv_name" className={FIELD_LABEL}>
              الاسم الكامل
            </label>
            <input id="cv_name" type="text" {...register('fullName')} className={EDIT_INPUT} />
            {errors.fullName && (
              <p role="alert" className="field-error">
                {errors.fullName.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="cv_id" className={FIELD_LABEL}>
                رقم الهوية
              </label>
              <input
                id="cv_id"
                type="number"
                readOnly
                value={specialist?.nationalId ?? ''}
                className={READONLY_INPUT}
              />
            </div>
            <div>
              <label htmlFor="cv_license" className={FIELD_LABEL}>
                رقم الترخيص
              </label>
              <input
                id="cv_license"
                type="text"
                readOnly
                value={specialist?.license ?? ''}
                className={READONLY_INPUT}
              />
            </div>
          </div>

          <div>
            <label htmlFor="cv_edu" className={FIELD_LABEL}>
              التخصص الدقيق
            </label>
            <input
              id="cv_edu"
              type="text"
              {...register('edu')}
              className={EDIT_INPUT}
              placeholder="مثال: هندسة بيئية، استشارات استدامة..."
            />
          </div>

          <div>
            <label htmlFor="cv_years" className={FIELD_LABEL}>
              سنوات الخبرة
            </label>
            <input
              id="cv_years"
              type="number"
              {...register('years')}
              className={EDIT_INPUT}
              placeholder="مثال: 5"
            />
          </div>
          <div>
            <label htmlFor="cv_city" className={FIELD_LABEL}>
              المدينة
            </label>
            <input
              id="cv_city"
              type="text"
              {...register('city')}
              className={EDIT_INPUT}
              placeholder="أدخل المدينة"
            />
          </div>

        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="cv_email" className={FIELD_LABEL}>
              البريد الإلكتروني
            </label>
            <input
              id="cv_email"
              type="email"
              dir="ltr"
              {...register('email')}
              aria-invalid={Boolean(errors.email)}
              className={`${EDIT_INPUT} text-left`}
            />
            {errors.email && (
              <p role="alert" className="field-error">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="cv_phone" className={FIELD_LABEL}>
              رقم الجوال
            </label>
            <input
              id="cv_phone"
              type="number"
              dir="ltr"
              {...register('phone')}
              className={`${EDIT_INPUT} text-left`}
            />
          </div>

          <div>
            <label htmlFor="cv_exp" className={FIELD_LABEL}>
              نبذة مفصلة عن الخبرات والمشاريع
            </label>
            <textarea
              id="cv_exp"
              rows={4}
              {...register('exp')}
              className={`${EDIT_INPUT} resize-none`}
              placeholder="اذكر أهم المشاريع التي عملت عليها والجهات التي تعاونت معها..."
            />
          </div>

          <div>
            <label htmlFor="cv_portfolio" className={FIELD_LABEL}>
              رابط الأعمال (اختياري)
            </label>
            <input
              id="cv_portfolio"
              type="url"
              dir="ltr"
              {...register('portfolio')}
              aria-invalid={Boolean(errors.portfolio)}
              className={`${EDIT_INPUT} text-left`}
              placeholder="https://linkedin.com/in/..."
            />
            {errors.portfolio && (
              <p role="alert" className="field-error">
                {errors.portfolio.message}
              </p>
            )}
          </div>

          <div className="mt-2">
            <p id="resume-label" className="field-label">
              إرفاق ملف السيرة الذاتية (PDF)
            </p>
            <button
              type="button"
              onClick={() => resumeInputRef.current?.click()}
              disabled={resumeUploading}
              aria-describedby="resume-label"
              className="btn btn-block min-h-12 border-2 border-dashed border-sage bg-wash text-forest hover:border-secondary hover:bg-accent-soft"
            >
              {resumeUploading ? (
                <Spinner className="w-4 h-4 border-2" />
              ) : (
                <span className="material-symbols-outlined text-[20px]">upload_file</span>
              )}{' '}
              اختر ملف
            </button>
            <input
              ref={resumeInputRef}
              id="resume_upload"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleResumeChange(file);
                event.target.value = '';
              }}
            />
            <div className="mt-2 text-xs text-center text-muted">
              {resumeName && <span className="font-bold text-success">تم إرفاق: {resumeName}</span>}
            </div>
          </div>
        </div>
      </form>

      {/* Printable representation of the current CV (never shown on screen). */}
      <div className="print-only" aria-hidden="true">
        <CVDocument ref={printRef} data={buildPreviewData()} />
      </div>

      <CVPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        data={buildPreviewData()}
      />
    </div>
  );
}

