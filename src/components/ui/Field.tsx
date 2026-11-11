import type { ReactNode } from 'react';

interface FieldProps {
  /** Id of the control inside — wires up the label and the error/hint text. */
  id: string;
  label: ReactNode;
  required?: boolean;
  /** Validation message; rendered with role="alert". */
  error?: string;
  hint?: ReactNode;
  className?: string;
  /** The control. Give it `id={id}`, `className="field-input"` and
   *  `aria-describedby={describedBy(id, …)}` when it has hint/error text. */
  children: ReactNode;
}

/** `aria-describedby` value for a field's hint/error ids. */
export function describedBy(id: string, { error, hint }: { error?: unknown; hint?: unknown }) {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length ? ids.join(' ') : undefined;
}

/** Label + control + hint + error — the one form-field layout of the app. */
export function Field({ id, label, required, error, hint, className = '', children }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
        {required && (
          <span className="field-required" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
