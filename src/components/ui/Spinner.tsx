interface SpinnerProps {
  /** Size/border classes — defaults to a small inline spinner. */
  className?: string;
}

/** Reusable loading spinner (same border styling as the legacy waiting room). */
export function Spinner({ className = 'w-6 h-6 border-4' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="جاري التحميل"
      className={`inline-block border-surface-container-high border-t-primary rounded-full animate-spin ${className}`}
    />
  );
}
