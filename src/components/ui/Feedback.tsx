interface MessageProps {
  message?: string;
  className?: string;
}

/** Neutral empty-state line (legacy: "لا توجد ..." messages). */
export function EmptyState({ message, className = 'text-center p-4 text-secondary text-sm' }: MessageProps) {
  return <div className={className}>{message}</div>;
}

/** Red error line (legacy: "حدث خطأ."). */
export function ErrorState({ message = 'حدث خطأ.', className = 'text-center p-4 text-red-500 text-sm' }: MessageProps) {
  return <div className={className}>{message}</div>;
}

/** Neutral loading line (legacy: "جاري التحميل..."). */
export function LoadingState({ message = 'جاري التحميل...', className = 'text-center p-4 text-secondary text-sm' }: MessageProps) {
  return (
    <div className={className} role="status">
      {message}
    </div>
  );
}
