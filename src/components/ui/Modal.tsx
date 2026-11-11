'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Accessible dialog title (Arabic copy provided by the caller). */
  title: string;
  /** Material Symbols icon name shown next to the title. */
  icon: string;
  /** Extra panel classes — usually just a max width (default `max-w-2xl`). */
  panelClassName?: string;
  /** Extra header classes (spacing / divider). */
  headerClassName?: string;
  children: ReactNode;
}

/**
 * Accessible reusable modal: Escape to close, focus moved into the dialog and
 * restored on close, ARIA dialog semantics, and scroll locking.
 */
export function Modal({
  open,
  onClose,
  title,
  icon,
  panelClassName = 'max-w-2xl',
  headerClassName = 'mb-5 border-b border-line pb-4',
  children,
}: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panelRef.current)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  // Modals always start closed (client state), so SSR/hydration render null
  // on both sides; the portal only mounts after a user interaction.
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/55 p-4 backdrop-blur-[2px]">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-dialog bg-white p-6 shadow-dialog outline-none ${panelClassName}`}
      >
        <div className={`flex items-center justify-between gap-3 ${headerClassName}`}>
          <h3
            id={titleId}
            className="flex items-center gap-2 text-lg font-bold text-forest"
          >
            <span aria-hidden="true" className="icon-tile size-9 rounded-xl">
              <span className="material-symbols-outlined text-[20px]">{icon}</span>
            </span>
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="btn btn-ghost btn-icon size-9 shrink-0"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
