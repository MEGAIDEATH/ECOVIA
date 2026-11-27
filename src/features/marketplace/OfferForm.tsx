'use client';

import { useActionState, useState } from 'react';

import { ActionStatus } from '@/components/ui/ActionForm';
import { Field, describedBy } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';
import { IDLE_STATE, fieldError, type FormAction } from '@/lib/actionState';
import { DURATION_LIMITS, DURATION_UNIT_LABELS, DURATION_UNITS, formatDuration, type DurationUnit } from '@/lib/serviceRequests';

/**
 * The specialist's offer: the time needed to execute the service (validated
 * number + unit) and an optional message. Submitting again revises the same
 * offer while it is still under review.
 */
export function OfferForm({
  action,
  requestId,
  existing,
}: {
  action: FormAction;
  requestId: string;
  existing: { durationValue: number; durationUnit: DurationUnit; message: string | null } | null;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE_STATE);
  const [value, setValue] = useState(existing ? String(existing.durationValue) : '');
  const [unit, setUnit] = useState<DurationUnit>(existing?.durationUnit ?? 'week');
  const [message, setMessage] = useState(existing?.message ?? '');
  const err = (name: string) => fieldError(state, name);
  const n = Number(value);
  const preview = Number.isInteger(n) && n >= 1 && n <= DURATION_LIMITS[unit] ? formatDuration(n, unit) : null;
  const durationError = err('durationValue') ?? err('durationUnit');

  return (
    <form action={formAction} noValidate className="space-y-4">
      <input type="hidden" name="requestId" value={requestId} />
      <Field
        id="offer-duration"
        label="المدة المطلوبة لتنفيذ الخدمة"
        required
        error={durationError}
        hint={preview ? `ستظهر للمنشأة: ${preview}` : `عدد صحيح من 1 إلى ${DURATION_LIMITS[unit]}`}
      >
        <div className="flex gap-2">
          <input
            id="offer-duration"
            name="durationValue"
            type="text"
            inputMode="numeric"
            dir="ltr"
            value={value}
            onChange={(event) => setValue(event.target.value.replace(/\D/g, '').slice(0, 4))}
            aria-invalid={Boolean(durationError)}
            aria-describedby={describedBy('offer-duration', { error: durationError, hint: true })}
            className="field-input w-24 shrink-0 text-center"
            placeholder="3"
            required
          />
          <label htmlFor="offer-duration-unit" className="sr-only">
            وحدة المدة
          </label>
          <select
            id="offer-duration-unit"
            name="durationUnit"
            value={unit}
            onChange={(event) => setUnit(event.target.value as DurationUnit)}
            className="field-input flex-1"
          >
            {DURATION_UNITS.map((option) => (
              <option key={option} value={option}>
                {DURATION_UNIT_LABELS[option]}
              </option>
            ))}
          </select>
        </div>
      </Field>
      <Field id="offer-message" label="رسالة للمنشأة" error={err('message')} hint="اختياري — منهجيتك، خبرتك في خدمات مشابهة، أو ما تحتاجه من المنشأة.">
        <textarea
          id="offer-message"
          name="message"
          rows={4}
          maxLength={2000}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          aria-describedby={describedBy('offer-message', { error: err('message'), hint: true })}
          className="field-input"
        />
      </Field>
      <ActionStatus state={state} />
      <button type="submit" disabled={pending} aria-busy={pending} className="btn btn-primary">
        {pending ? (
          <span className="inline-flex items-center gap-2">
            <Spinner className="size-4 border-2" /> جاري الإرسال...
          </span>
        ) : existing ? (
          'تحديث العرض'
        ) : (
          'تقديم العرض'
        )}
      </button>
    </form>
  );
}
