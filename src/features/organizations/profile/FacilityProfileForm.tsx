'use client';

import { useActionState, useRef, useState, type KeyboardEvent } from 'react';

import { ActionStatus } from '@/components/ui/ActionForm';
import { initialsOf } from '@/components/ui/Avatar';
import { Field, describedBy } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';
import { uploadProfileImage, UploadValidationError } from '@/features/storage/storageService';
import { IDLE_STATE, fieldError, type FormAction } from '@/lib/actionState';
import { documentIdFromUrl, fileUrl } from '@/lib/utils/cv';

const MAX_FIELDS = 10;
const MAX_FIELD_LENGTH = 60;

export interface FacilityProfileValues {
  orgName: string;
  phone: string;
  orgDesc: string;
  businessFields: string[];
  website: string;
  profileImageId: string | null;
}

/**
 * Facility profile editor: logo (validated image upload to private storage),
 * fields of business (removable tags), description, website and contact
 * phone. The registered name is shown read-only. The server re-validates
 * everything (`updateOrganizationProfileAction`).
 */
export function FacilityProfileForm({ action, initial }: { action: FormAction; initial: FacilityProfileValues }) {
  const [state, formAction, pending] = useActionState(action, IDLE_STATE);
  const [phone, setPhone] = useState(initial.phone);
  const [orgDesc, setOrgDesc] = useState(initial.orgDesc);
  const [website, setWebsite] = useState(initial.website);
  const [fields, setFields] = useState<string[]>(initial.businessFields);
  const [draft, setDraft] = useState('');
  const [fieldsError, setFieldsError] = useState<string | null>(null);
  const [imageId, setImageId] = useState<string | null>(initial.profileImageId);
  const [imageChange, setImageChange] = useState<'keep' | 'remove' | string>('keep');
  const [preview, setPreview] = useState<string | null>(fileUrl(initial.profileImageId));
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const err = (name: string) => fieldError(state, name);

  const addField = () => {
    const tag = draft.replace(/\s+/g, ' ').trim();
    if (!tag) return;
    if (tag.length > MAX_FIELD_LENGTH) return setFieldsError(`المجال حتى ${MAX_FIELD_LENGTH} حرفاً.`);
    if (fields.length >= MAX_FIELDS) return setFieldsError(`حتى ${MAX_FIELDS} مجالات.`);
    if (fields.some((existing) => existing.toLowerCase() === tag.toLowerCase())) return setDraft('');
    setFields([...fields, tag]);
    setDraft('');
    setFieldsError(null);
  };

  const onFieldKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',' || event.key === '،') {
      event.preventDefault();
      addField();
    }
  };

  const onLogo = async (file: File) => {
    setUploadError(null);
    setUploading(true);
    const local = URL.createObjectURL(file);
    setPreview(local);
    try {
      const url = await uploadProfileImage(file).promise;
      const id = documentIdFromUrl(url);
      setImageId(id);
      setImageChange(id ?? 'keep');
      setPreview(url);
    } catch (error) {
      setUploadError(error instanceof UploadValidationError ? error.message : 'تعذر رفع الشعار، حاول مرة أخرى.');
      setPreview(fileUrl(imageId));
    } finally {
      URL.revokeObjectURL(local);
      setUploading(false);
    }
  };

  return (
    <form action={formAction} noValidate className="card space-y-6 p-5 md:p-7">
      <input type="hidden" name="profileImageId" value={imageChange} />
      {fields.map((field) => (
        <input key={field} type="hidden" name="businessFields" value={field} />
      ))}

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-[18px] border border-line bg-accent-soft">
          {preview ? (
            <img src={preview} alt="شعار المنشأة" className="size-full object-cover" />
          ) : (
            <span aria-hidden="true" className="grid size-full place-items-center text-2xl font-bold text-secondary">
              {initialsOf(initial.orgName)}
            </span>
          )}
          {uploading && (
            <span className="absolute inset-0 grid place-items-center bg-white/70">
              <Spinner className="size-6 border-2" />
            </span>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-sm font-bold text-forest">شعار المنشأة أو صورة الملف</p>
          <p className="text-xs text-muted">JPG أو PNG أو WebP، حتى 4 ميجابايت.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn btn-secondary btn-sm">
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                upload
              </span>
              {preview ? 'تغيير الشعار' : 'رفع شعار'}
            </button>
            {preview && (
              <button
                type="button"
                onClick={() => {
                  setPreview(null);
                  setImageId(null);
                  setImageChange('remove');
                }}
                className="btn btn-ghost btn-sm"
              >
                إزالة
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            aria-label="رفع شعار المنشأة"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onLogo(file);
              event.target.value = '';
            }}
          />
          {(uploadError || err('profileImageId')) && (
            <p role="alert" className="field-error">
              {uploadError ?? err('profileImageId')}
            </p>
          )}
        </div>
      </div>

      <Field id="org-name" label="اسم المنشأة (المسجّل)" hint="الاسم المعتمد من السجل التجاري، ولا يُعدَّل من هنا.">
        <input id="org-name" value={initial.orgName} readOnly aria-describedby="org-name-hint" className="field-input" />
      </Field>

      <div>
        <label htmlFor="business-field-input" className="field-label">
          مجالات العمل
        </label>
        <div className="mb-2 flex flex-wrap gap-1.5" aria-live="polite">
          {fields.length === 0 && <span className="text-xs text-muted">لم تُضف مجالات بعد.</span>}
          {fields.map((field) => (
            <span key={field} className="badge badge-brand gap-1 py-1 ps-3 pe-1 text-[13px]">
              {field}
              <button
                type="button"
                onClick={() => setFields(fields.filter((existing) => existing !== field))}
                aria-label={`إزالة ${field}`}
                className="grid size-6 place-items-center rounded-full hover:bg-white/70"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                  close
                </span>
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            id="business-field-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onFieldKey}
            maxLength={MAX_FIELD_LENGTH + 5}
            placeholder="مثال: صناعات غذائية"
            aria-describedby="business-field-hint"
            className="field-input"
          />
          <button type="button" onClick={addField} className="btn btn-secondary">
            إضافة
          </button>
        </div>
        <p id="business-field-hint" className="field-hint">
          اضغط Enter أو «إضافة» بعد كل مجال (حتى {MAX_FIELDS}).
        </p>
        {(fieldsError || err('businessFields')) && (
          <p role="alert" className="field-error">
            {fieldsError ?? err('businessFields')}
          </p>
        )}
      </div>

      <Field id="org-desc" label="نبذة عن المنشأة" required error={err('orgDesc')}>
        <textarea
          id="org-desc"
          name="orgDesc"
          rows={5}
          maxLength={2000}
          value={orgDesc}
          onChange={(event) => setOrgDesc(event.target.value)}
          aria-invalid={Boolean(err('orgDesc'))}
          aria-describedby={describedBy('org-desc', { error: err('orgDesc') })}
          className="field-input"
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field id="org-phone" label="رقم التواصل" required error={err('phone')}>
          <input
            id="org-phone"
            name="phone"
            type="tel"
            dir="ltr"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            aria-invalid={Boolean(err('phone'))}
            aria-describedby={describedBy('org-phone', { error: err('phone') })}
            className="field-input text-left"
          />
        </Field>
        <Field id="org-website" label="الموقع الإلكتروني" error={err('website')}>
          <input
            id="org-website"
            name="website"
            type="url"
            dir="ltr"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            placeholder="https://"
            aria-invalid={Boolean(err('website'))}
            aria-describedby={describedBy('org-website', { error: err('website') })}
            className="field-input text-left"
          />
        </Field>
      </div>

      <ActionStatus state={state} />
      <div className="flex justify-end border-t border-line pt-5">
        <button type="submit" disabled={pending || uploading} aria-busy={pending} className="btn btn-primary">
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Spinner className="size-4 border-2" /> جاري الحفظ...
            </span>
          ) : (
            'حفظ ملف المنشأة'
          )}
        </button>
      </div>
    </form>
  );
}
