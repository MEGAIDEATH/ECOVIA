'use client';

import { useActionState, useState, type ReactNode } from 'react';

import { Modal } from '@/components/ui/Modal';
import { IDLE_STATE, type ActionState, type FormAction } from '@/lib/actionState';

import { Spinner } from './Spinner';

export function ActionStatus({ state }: { state: ActionState }) {
  if (state.status === 'idle') return null;
  return (
    <p
      role={state.status === 'error' ? 'alert' : 'status'}
      className={`mt-2 text-sm font-semibold ${state.status === 'error' ? 'text-danger' : 'text-success'}`}
    >
      {state.message}
    </p>
  );
}

interface ActionFormProps {
  action: FormAction;
  /** Hidden inputs identifying the record (re-validated on the server). */
  hidden?: Record<string, string>;
  label: ReactNode;
  pendingLabel?: string;
  buttonClassName?: string;
  /** Destructive / irreversible actions ask first. */
  confirm?: { title: string; body: ReactNode; confirmLabel: string; icon?: string; danger?: boolean };
  /** Extra fields rendered inside the (confirmation) form, e.g. a reason. */
  children?: ReactNode;
}

/**
 * A single-button form bound to a Server Action with `useActionState`. The
 * action re-checks the session and the record; this component only renders
 * the pending state and the server's message.
 */
export function ActionForm({
  action,
  hidden = {},
  label,
  pendingLabel = 'جاري التنفيذ...',
  buttonClassName = 'btn btn-secondary',
  confirm,
  children,
}: ActionFormProps) {
  const [state, formAction, pending] = useActionState(action, IDLE_STATE);
  const [open, setOpen] = useState(false);

  const fields = (
    <>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {children}
    </>
  );

  const submit = (className: string, text: ReactNode) => (
    <button type="submit" disabled={pending} aria-busy={pending} className={className}>
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Spinner className="size-4 border-2" />
          {pendingLabel}
        </span>
      ) : (
        text
      )}
    </button>
  );

  if (!confirm) {
    return (
      <form action={formAction} className="contents">
        <div>
          {fields}
          {submit(buttonClassName, label)}
          <ActionStatus state={state} />
        </div>
      </form>
    );
  }

  const done = state.status === 'success';
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)} className={buttonClassName} disabled={done}>
        {label}
      </button>
      {!open && <ActionStatus state={state} />}
      <Modal
        open={open && !done}
        onClose={() => setOpen(false)}
        title={confirm.title}
        icon={confirm.icon ?? 'help'}
        panelClassName="max-w-md"
      >
        <form action={formAction} className="space-y-4">
          <div className="text-[15px] leading-relaxed text-on-surface">{confirm.body}</div>
          {fields}
          <ActionStatus state={state} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary">
              تراجع
            </button>
            {submit(confirm.danger ? 'btn btn-danger' : 'btn btn-primary', confirm.confirmLabel)}
          </div>
        </form>
      </Modal>
    </div>
  );
}
