interface MessageProps {
  message?: string;
  /** Replaces the default layout classes entirely (e.g. `col-span-full …`). */
  className?: string;
}

const BOX = 'flex flex-col items-center justify-center gap-2 px-4 py-10 text-center text-sm';

/** Neutral empty state ("لا توجد ..."). */
export function EmptyState({ message, className = `${BOX} text-muted` }: MessageProps) {
  return (
    <div className={className}>
      <span aria-hidden="true" className="material-symbols-outlined text-[32px] text-outline-variant">
        inbox
      </span>
      {message}
    </div>
  );
}

/** Error state ("حدث خطأ."). */
export function ErrorState({ message = 'حدث خطأ.', className = `${BOX} font-semibold text-danger` }: MessageProps) {
  return (
    <div className={className} role="alert">
      <span aria-hidden="true" className="material-symbols-outlined text-[28px]">
        error
      </span>
      {message}
    </div>
  );
}

/** Loading state ("جاري التحميل..."). */
export function LoadingState({ message = 'جاري التحميل...', className = `${BOX} text-muted` }: MessageProps) {
  return (
    <div className={className} role="status">
      <span
        aria-hidden="true"
        className="inline-block size-6 animate-spin rounded-full border-[3px] border-surface-container-high border-t-secondary"
      />
      {message}
    </div>
  );
}
