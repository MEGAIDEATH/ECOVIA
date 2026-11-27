'use client';

import { useActionState, useState } from 'react';

import { ActionStatus } from '@/components/ui/ActionForm';
import { Field, describedBy } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';
import { IDLE_STATE, fieldError, type FormAction } from '@/lib/actionState';

/**
 * The specialist signs a pending contract with their typed full name after
 * confirming they read it. Signing closes the request to new offers.
 */
export function SignContractForm({ action, contractId }: { action: FormAction; contractId: string }) {
  const [state, formAction, pending] = useActionState(action, IDLE_STATE);
  const [signature, setSignature] = useState('');
  const [agreed, setAgreed] = useState(false);
  const err = fieldError(state, 'signature');

  if (state.status === 'success') return <ActionStatus state={state} />;

  return (
    <form action={formAction} noValidate className="space-y-3">
      <input type="hidden" name="contractId" value={contractId} />
      <Field
        id={`sign-${contractId}`}
        label="توقيعك (اسمك الكامل)"
        required
        error={err}
        hint="التوقيع اسم مكتوب يُقر به الطرفان داخل المنصة، وليس توقيعاً إلكترونياً موثّقاً."
      >
        <input
          id={`sign-${contractId}`}
          name="signature"
          value={signature}
          onChange={(event) => setSignature(event.target.value)}
          maxLength={100}
          aria-invalid={Boolean(err)}
          aria-describedby={describedBy(`sign-${contractId}`, { error: err, hint: true })}
          className="field-input text-center font-bold"
          autoComplete="name"
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
        اطلعت على العقد وأوافق على بنوده.
      </label>
      <ActionStatus state={state} />
      <button type="submit" disabled={pending || !agreed} aria-busy={pending} className="btn btn-primary">
        {pending ? (
          <span className="inline-flex items-center gap-2">
            <Spinner className="size-4 border-2" /> جاري التوقيع...
          </span>
        ) : (
          'توقيع العقد'
        )}
      </button>
    </form>
  );
}
