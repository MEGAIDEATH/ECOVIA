interface ScanOverlayProps {
  visible: boolean;
  message: string;
}

/**
 * Animated scanning overlay used by all three document scanners
 * (personal / license / commercial registration).
 */
export function ScanOverlay({ visible, message }: ScanOverlayProps) {
  if (!visible) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-2xl"
    >
      <div className="w-full h-1 bg-primary/20 absolute top-0 left-0 overflow-hidden">
        <div className="h-full bg-primary absolute w-full animate-[scan_2s_ease-in-out_infinite]" />
      </div>
      <span className="material-symbols-outlined text-4xl text-primary animate-pulse mb-2">
        document_scanner
      </span>
      <p className="text-primary font-bold text-sm text-center px-4">{message}</p>
    </div>
  );
}