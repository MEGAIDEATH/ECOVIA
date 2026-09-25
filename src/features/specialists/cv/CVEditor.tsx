'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { cvSchema, type CvValues } from '@/lib/validation/forms';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  uploadProfileImage,
  uploadResume,
  UploadValidationError,
} from '@/features/storage/storageService';

import { useSpecialistDashboard } from '../dashboard/SpecialistDashboardProvider';
import { updateSpecialistProfile } from '../specialistRepository';
import { CVPreviewModal } from './CVPreviewModal';

/** Specialist CV editor (legacy `scontent-cv`). */
export function CVEditor() {
  const { specialist, refresh } = useSpecialistDashboard();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Profile photo state: instant local preview + Storage upload.
  const [picPreview, setPicPreview] = useState<string | null>(specialist?.profilePic ?? null);
  const [picUrl, setPicUrl] = useState<string | null>(specialist?.profilePic ?? null);
  const [picUploading, setPicUploading] = useState(false);
  const [pendingPic, setPendingPic] = useState<Promise<string> | null>(null);

  // Resume state.
  const [resumeUrl, setResumeUrl] = useState<string | null>(specialist?.resumeFile ?? null);
  const [resumeName, setResumeName] = useState<string | null>(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [pendingResume, setPendingResume] = useState<Promise<string> | null>(null);

  const picInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);

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
      const handle = uploadProfileImage(user.uid, file);
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
      const handle = uploadResume(user.uid, file);
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

      await updateSpecialistProfile(user.uid, {
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        edu: values.edu,
        years: values.years,
        exp: values.exp,
        portfolio: values.portfolio,
        profilePic: finalPic ?? null,
        resumeFile: finalResume ?? null,
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

  const EDIT_INPUT =
    'w-full px-3 py-2 bg-surface rounded-lg border border-outline-variant focus:border-primary outline-none transition-all';
  const READONLY_INPUT =
    'w-full px-3 py-2 bg-surface-container-low rounded-lg border border-transparent outline-none text-secondary';
  const FIELD_LABEL = 'block text-xs font-bold text-secondary mb-1';

  return (
    <div className="fade-up bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-outline-variant/30 relative">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h3 className="text-xl font-bold text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-2xl">person_book</span> السيرة الذاتية
          الرقمية
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="px-4 py-2 bg-surface-container-high text-on-surface font-bold rounded-xl hover:bg-outline-variant transition-colors flex items-center gap-1 text-sm shadow-sm border border-outline-variant/50"
          >
            <span className="material-symbols-outlined text-[18px]">visibility</span> استعراض
          </button>
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={saving}
            className="px-4 py-2 bg-primary text-white font-bold rounded-xl hover:bg-[#006d44] transition-colors flex items-center gap-1 text-sm shadow-md disabled:opacity-70"
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
              className="relative w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center border-2 border-primary/20 overflow-hidden cursor-pointer hover:border-primary transition-colors"
            >
              {picPreview ? (
                <img src={picPreview} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-3xl text-secondary">
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
              <p className="text-sm font-bold text-primary">الصورة الشخصية (اختياري)</p>
              <p className="text-xs text-secondary mt-1">اضغط للتعديل (JPG/PNG)</p>
            </div>
          </div>

          <div>
            <label htmlFor="cv_name" className={FIELD_LABEL}>
              الاسم الكامل
            </label>
            <input id="cv_name" type="text" {...register('fullName')} className={EDIT_INPUT} />
            {errors.fullName && (
              <p role="alert" className="mt-1 text-xs font-bold text-red-500">
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
              <p role="alert" className="mt-1 text-xs font-bold text-red-500">
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
              <p role="alert" className="mt-1 text-xs font-bold text-red-500">
                {errors.portfolio.message}
              </p>
            )}
          </div>

          <div className="mt-2">
            <label className="block text-xs font-bold text-secondary mb-2">
              إرفاق ملف السيرة الذاتية (PDF)
            </label>
            <button
              type="button"
              onClick={() => resumeInputRef.current?.click()}
              disabled={resumeUploading}
              className="w-full px-3 py-2.5 bg-surface-container-high rounded-lg border-2 border-dashed border-outline-variant hover:border-primary transition-colors flex items-center justify-center gap-2 text-sm text-primary font-bold disabled:opacity-70"
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
            <div className="mt-2 text-xs text-center text-secondary">
              {resumeName && <span className="text-primary font-bold">تم إرفاق: {resumeName}</span>}
            </div>
          </div>
        </div>
      </form>

      <CVPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        data={buildPreviewData()}
      />
    </div>
  );
}

