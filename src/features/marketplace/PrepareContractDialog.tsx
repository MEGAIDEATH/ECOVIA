'use client';

import { useActionState, useState } from 'react';

import { ActionStatus } from '@/components/ui/ActionForm';
import { Field, describedBy } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { IDLE_STATE, fieldError, type FormAction } from '@/lib/actionState';

/**
 * "Select offer & prepare contract": the facility fills the contract value and
 * signs with the authorized signatory's typed name; the specialist then signs.
 * The request stays open to other offers until the specialist signs.
 */
export function PrepareContractDialog({
  action,
  offerId,
  requestId,
  specialistName,
  defaultTitle,
  durationLabel,
}: {
  action: FormAction;
  offerId: string;
  requestId: string;
  specialistName: string;
  defaultTitle: string;
  durationLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, IDLE_STATE);
  const [title, setTitle] = useState(defaultTitle);
  const [value, setValue] = useState('');
  const [signature, setSignature] = useState('');
  const [agreed, setAgreed] = useState(false);
  const err = (name: string) => fieldError(state, name);
  const done = state.status === 'success';

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary btn-sm" disabled={done}>
        <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
          contract_edit
        </span>
        اختيار العرض وإعداد العقد
      </button>
      {!open && <ActionStatus state={state} />}
      <Modal open={open && !done} onClose={() => setOpen(false)} title={`إعداد عقد مع ${specialistName}`} icon="contract" panelClassName="max-w-lg">
        <form action={formAction} noValidate className="space-y-4 overflow-y-auto pe-1">
          <input type="hidden" name="offerId" value={offerId} />
          <input type="hidden" name="requestId" value={requestId} />
          <p className="alert alert-info">
            يبقى الطلب مفتوحاً لاستقبال العروض حتى يوقّع الأخصائي العقد. مدة التنفيذ وفق العرض: <strong>{durationLabel}</strong>.
          </p>
          <Field id="contract-title" label="عنوان العقد" error={err('title')}>
            <input
              id="contract-title"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              className="field-input"
            />
          </Field>
          <Field id="contract-value" label="قيمة العقد (ريال)" required error={err('value')}>
            <input
              id="contract-value"
              name="value"
              inputMode="decimal"
              dir="ltr"
              value={value}
              onChange={(event) => setValue(event.target.value.replace(/[^\d.]/g, ''))}
              aria-invalid={Boolean(err('value'))}
              aria-describedby={describedBy('contract-value', { error: err('value') })}
              className="field-input text-left"
              placeholder="15000"
              required
            />
          </Field>
          <Field
            id="contract-org-signature"
            label="توقيع المنشأة (اسم المفوّض بالتوقيع)"
            required
            error={err('organizationSignature')}
            hint="التوقيع اسم مكتوب يُقر به الطرفان داخل المنصة، وليس توقيعاً إلكترونياً موثّقاً."
          >
            <input
              id="contract-org-signature"
              name="organizationSignature"
              value={signature}
              onChange={(event) => setSignature(event.target.value)}
              maxLength={100}
              aria-invalid={Boolean(err('organizationSignature'))}
              aria-describedby={describedBy('contract-org-signature', { error: err('organizationSignature'), hint: true })}
              className="field-input text-center font-bold"
              required
            />
          </Field>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              className="mt-1 size-4 accent-[var(--color-secondary)]"
            />
            أقر بأنني مفوّض بالتوقيع عن المنشأة وأن بيانات العقد صحيحة.
          </label>
          <ActionStatus state={state} />
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary">
              تراجع
            </button>
            <button type="submit" disabled={pending || !agreed} aria-busy={pending} className="btn btn-primary">
              {pending ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="size-4 border-2" /> جاري الإعداد...
                </span>
              ) : (
                'إرسال العقد للأخصائي'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
