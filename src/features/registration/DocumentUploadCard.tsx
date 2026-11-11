'use client';

import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { ScanOverlay } from '@/components/ui/ScanOverlay';

interface DocumentUploadCardProps {
  icon: string;
  title: string;
  description: string;
  accept?: string;
  scanning: boolean;
  scanningMessage: string;
  onFile: (file: File) => void;
  /** When set, replaces the default content (legacy "تم الإرفاق تلقائياً" label). */
  attachedFileName?: string | null;
  /** Extra classes for the card (spacing). */
  className?: string;
  /** The default content block may need the legacy inner layout. */
  children?: ReactNode;
  inputId: string;
}

/**
 * Reusable dashed upload card with animated scan overlay — used by the
 * personal, license, and commercial-registration scanners.
 */
export function DocumentUploadCard({
  icon,
  title,
  description,
  accept = 'image/*,.pdf',
  scanning,
  scanningMessage,
  onFile,
  attachedFileName,
  className = '',
  children,
  inputId,
}: DocumentUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pressed, setPressed] = useState(false);

  const openPicker = () => inputRef.current?.click();

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPicker();
    }
  };

  const handleChange = () => {
    const input = inputRef.current;
    const file = input?.files?.[0];
    if (file) onFile(file);
    // Allow re-selecting the same file after a failure.
    if (input) input.value = '';
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={title}
      onClick={openPicker}
      onKeyDown={onKeyDown}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      className={`group relative cursor-pointer rounded-card border-2 border-dashed border-sage bg-wash p-6 text-center transition-colors hover:border-secondary hover:bg-accent-soft ${
        pressed ? 'scale-[0.99]' : ''
      } ${className}`}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />
      {attachedFileName ? (
        <div className="flex flex-col items-center">
          <span aria-hidden="true" className="material-symbols-outlined mb-1 block text-2xl text-success">
            task_alt
          </span>
          <span className="text-sm font-bold break-all text-forest">
            تم الإرفاق تلقائياً: {attachedFileName}
          </span>
        </div>
      ) : (
        children ?? (
          <div className="flex flex-col items-center">
            <span className="icon-tile icon-tile-lg mb-3 bg-white transition-transform group-hover:scale-105">
              <span aria-hidden="true" className="material-symbols-outlined text-[28px]">{icon}</span>
            </span>
            <h3 className="mb-1 font-bold text-forest">{title}</h3>
            <p className="max-w-sm text-xs leading-relaxed text-muted">{description}</p>
          </div>
        )
      )}
      <ScanOverlay visible={scanning} message={scanningMessage} />
    </div>
  );
}