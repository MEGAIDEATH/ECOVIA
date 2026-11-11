interface SpinnerProps {
  /** Size/border classes — defaults to a small inline spinner. */
  className?: string;
}

/** Reusable loading spinner (brand track + green arc). */
export function Spinner({ className = 'w-6 h-6 border-4' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="جاري التحميل"
      className={`inline-block border-surface-container-high border-t-secondary rounded-full animate-spin ${className}`}
    />
  );
}
