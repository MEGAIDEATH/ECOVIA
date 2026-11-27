'use client';

import { printElement } from '@/lib/print';

/** Prints the element with `targetId` on its own (see src/lib/print.ts). */
export function PrintButton({ targetId, label = 'طباعة' }: { targetId: string; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        const element = document.getElementById(targetId);
        if (element) printElement(element);
      }}
      className="btn btn-secondary"
    >
      <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
        print
      </span>
      {label}
    </button>
  );
}
