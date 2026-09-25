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
  /** Panel classes — legacy modal sizes/backgrounds are passed per modal. */
  panelClassName?: string;
  /** Header classes — some legacy headers use a border, others extra margin. */
  headerClassName?: string;
  children: ReactNode;
}

/**
 * Accessible reusable modal: Escape to close, focus moved into the dialog and
 * restored on close, ARIA dialog semantics, and scroll locking — while keeping
 * the legacy backdrop/panel look.
 */
export function Modal({
  open,
  onClose,
  title,
  icon,
  panelClassName = 'bg-surface rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden p-6 relative',
  headerClassName = 'flex justify-between items-center mb-4 border-b pb-3',
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
    <div className="fixed inset-0 z-[100] items-center justify-center bg-black/60 p-4 backdrop-blur-sm flex">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`${panelClassName} outline-none`}
      >
        <div className={headerClassName}>
          <h3
            id={titleId}
            className="text-xl font-bold text-primary flex items-center gap-2"
          >
            <span className="material-symbols-outlined">{icon}</span> {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container-high flex items-center justify-center"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
