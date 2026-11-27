'use client';

import { useId, useState } from 'react';

import { SERVICE_TYPES, serviceTypeLabel, type ServiceTypeKey } from '@/lib/serviceTypes';

/**
 * Multi-select for the service catalogue. Built on native checkboxes (one
 * `serviceTypes` value per selection), so keyboard (Tab / Space), screen
 * readers, mobile and no-JS submission all work. Selected values are listed
 * as chips that can be removed individually. The server re-validates the
 * selection (`parseServiceTypes`).
 */
export function ServiceTypeMultiSelect({
  name = 'serviceTypes',
  defaultValue = [],
  error,
}: {
  name?: string;
  defaultValue?: ServiceTypeKey[];
  error?: string;
}) {
  const [selected, setSelected] = useState<ServiceTypeKey[]>(defaultValue);
  const baseId = useId();
  const errorId = `${baseId}-error`;
  const hintId = `${baseId}-hint`;

  const toggle = (key: ServiceTypeKey, checked: boolean) =>
    setSelected((current) =>
      checked ? SERVICE_TYPES.map((t) => t.key).filter((k) => k === key || current.includes(k)) : current.filter((k) => k !== key),
    );

  return (
    <fieldset aria-describedby={error ? errorId : hintId} aria-invalid={Boolean(error)} className="min-w-0">
      <legend className="field-label">
        نوع الخدمة
        <span className="field-required" aria-hidden="true">
          *
        </span>
      </legend>
      <p id={hintId} className="field-hint -mt-1 mb-2">
        اختر خدمة واحدة أو أكثر.
      </p>

      <div aria-live="polite" className="mb-3 flex min-h-9 flex-wrap items-center gap-1.5">
        {selected.length === 0 ? (
          <span className="text-xs text-muted">لم تُحدَّد أي خدمة بعد.</span>
        ) : (
          selected.map((key) => (
            <span key={key} className="badge badge-brand gap-1 py-1 ps-3 pe-1 text-[13px]">
              {serviceTypeLabel(key)}
              <button
                type="button"
                onClick={() => toggle(key, false)}
                aria-label={`إزالة ${serviceTypeLabel(key)}`}
                className="grid size-6 place-items-center rounded-full hover:bg-white/70"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                  close
                </span>
              </button>
            </span>
          ))
        )}
      </div>

      <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {SERVICE_TYPES.map((type) => {
          const id = `${baseId}-${type.key}`;
          const checked = selected.includes(type.key);
          return (
            <li key={type.key}>
              <label
                htmlFor={id}
                className={`flex h-full cursor-pointer items-start gap-3 rounded-control border p-3 transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-sage/50 ${
                  checked ? 'border-secondary bg-accent-soft' : 'border-outline-variant bg-white hover:border-line-strong'
                }`}
              >
                <input
                  id={id}
                  type="checkbox"
                  name={name}
                  value={type.key}
                  checked={checked}
                  onChange={(event) => toggle(type.key, event.target.checked)}
                  className="mt-1 size-4 shrink-0 accent-[var(--color-secondary)]"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-forest">{type.ar}</span>
                  <span lang="en" dir="ltr" className="mt-0.5 block text-start text-xs text-muted">
                    {type.en}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {error && (
        <p id={errorId} role="alert" className="field-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}
