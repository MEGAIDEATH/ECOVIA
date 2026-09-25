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
  /** Extra classes for the card (legacy variants differ in padding/surface). */
  className?: string;
  /** Per-variant inner classes (the three legacy cards differ slightly). */
  iconContainerClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
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
  iconContainerClassName = 'w-14 h-14 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform',
  titleClassName = 'text-primary font-bold mb-1',
  descriptionClassName = 'text-xs text-secondary',
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
      className={`relative border-2 border-dashed border-primary/30 rounded-2xl text-center hover:bg-primary/5 transition-colors cursor-pointer group ${
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
          <span className="material-symbols-outlined text-primary text-2xl block mb-1">
            task_alt
          </span>
          <span className="text-sm font-bold text-primary break-all">
            تم الإرفاق تلقائياً: {attachedFileName}
          </span>
        </div>
      ) : (
        children ?? (
          <div className="flex flex-col items-center">
            <div className={iconContainerClassName}>
              <span className="material-symbols-outlined text-3xl">{icon}</span>
            </div>
            <h3 className={titleClassName}>{title}</h3>
            <p className={descriptionClassName}>{description}</p>
          </div>
        )
      )}
      <ScanOverlay visible={scanning} message={scanningMessage} />
    </div>
  );
}