'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';

import { ActionStatus } from '@/components/ui/ActionForm';
import { Field, describedBy } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';
import { IDLE_STATE, fieldError, type FormAction } from '@/lib/actionState';
import { REGIONS } from '@/lib/regions';

import { ServiceTypeMultiSelect } from './ServiceTypeMultiSelect';

const DESCRIPTION_MAX = 5000;
const NOTES_MAX = 2000;

/**
 * "Submit New Service Request" form. Service Type (multi-select), Activity
 * Description, Notes, region and city. There is deliberately no price and no
 * duration: each specialist states the time they need in their offer.
 * A private request carries the target specialist chosen on their profile.
 */
export function RequestForm({
  action,
  target,
  defaultRegionCode,
}: {
  action: FormAction;
  target: { id: string; name: string } | null;
  defaultRegionCode: string | null;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE_STATE);
  const err = (name: string) => fieldError(state, name);
  // Controlled fields: React resets uncontrolled inputs after every action,
  // which would wipe the user's text when the server reports an error.
  const [activity, setActivity] = useState('');
  const [notes, setNotes] = useState('');
  const [region, setRegion] = useState(defaultRegionCode ?? '');
  const [city, setCity] = useState('');

  return (
    <form action={formAction} noValidate className="card max-w-3xl space-y-6 p-5 md:p-7">
      {target ? (
        <div className="alert alert-info items-center justify-between" role="note">
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
              lock
            </span>
            طلب خاص موجّه إلى <strong>{target.name}</strong> — لن يراه أي أخصائي آخر.
          </span>
          <Link href="/organization/requests/new" className="btn btn-ghost btn-sm">
            تحويله إلى طلب عام
          </Link>
          <input type="hidden" name="targetSpecialistId" value={target.id} />
        </div>
      ) : (
        <p className="text-sm text-muted">
          سيظهر الطلب للأخصائيين المعتمدين في المنطقة المختارة، ويصلهم إشعار به. يمكن لأكثر من أخصائي تقديم عرض حتى توقيع
          العقد.
        </p>
      )}

      <ServiceTypeMultiSelect error={err('serviceTypes')} />

      <Field id="req-activity" label="وصف النشاط" required error={err('activityDescription')} hint="صف نشاط المنشأة ونطاق الخدمة المطلوبة.">
        <textarea
          id="req-activity"
          name="activityDescription"
          value={activity}
          onChange={(event) => setActivity(event.target.value)}
          rows={5}
          maxLength={DESCRIPTION_MAX}
          required
          aria-invalid={Boolean(err('activityDescription'))}
          aria-describedby={describedBy('req-activity', { error: err('activityDescription'), hint: true })}
          className="field-input"
        />
      </Field>

      <Field id="req-notes" label="ملاحظات" error={err('notes')} hint="اختياري — أي متطلبات أو مواعيد أو معلومات إضافية.">
        <textarea
          id="req-notes"
          name="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          maxLength={NOTES_MAX}
          aria-invalid={Boolean(err('notes'))}
          aria-describedby={describedBy('req-notes', { error: err('notes'), hint: true })}
          className="field-input"
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field id="req-region" label="المنطقة" required error={err('region')}>
          <select
            id="req-region"
            name="region"
            value={region}
            onChange={(event) => setRegion(event.target.value)}
            required
            aria-invalid={Boolean(err('region'))}
            aria-describedby={describedBy('req-region', { error: err('region') })}
            className="field-input"
          >
            <option value="">اختر المنطقة</option>
            {REGIONS.map((region) => (
              <option key={region.code} value={region.code}>
                {region.nameAr}
              </option>
            ))}
          </select>
        </Field>
        <Field id="req-city" label="المدينة" error={err('city')}>
          <input
            id="req-city"
            name="city"
            type="text"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            maxLength={100}
            className="field-input"
          />
        </Field>
      </div>

      {err('targetSpecialistId') && <p className="field-error">{err('targetSpecialistId')}</p>}
      <ActionStatus state={state.status === 'error' ? state : IDLE_STATE} />

      <div className="flex justify-end gap-2 border-t border-line pt-5">
        <Link href="/organization/requests" className="btn btn-secondary">
          إلغاء
        </Link>
        <button type="submit" disabled={pending} aria-busy={pending} className="btn btn-primary">
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Spinner className="size-4 border-2" /> جاري النشر...
            </span>
          ) : target ? (
            'إرسال الطلب الخاص'
          ) : (
            'نشر الطلب'
          )}
        </button>
      </div>
    </form>
  );
}
