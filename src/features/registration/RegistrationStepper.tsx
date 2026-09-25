interface RegistrationStepperProps {
  /** Step shown as active (1 = personal info, 2 = license, 3 = verification). */
  current: 1 | 2 | 3;
}

/**
 * Three-step progress indicator used on specialist step 1 / step 2,
 * visually identical to the legacy markup (including the half-filled bar
 * on step 2).
 */
export function RegistrationStepper({ current }: RegistrationStepperProps) {
  return (
    <div className="flex justify-center mb-8 relative px-4">
      <div className="absolute top-1/2 left-8 right-8 h-1 bg-surface-container-high -translate-y-1/2 z-0 rounded-full">
        {current >= 2 && <div className="h-full w-1/2 bg-primary rounded-full" />}
      </div>
      <div className="flex justify-between w-full max-w-sm relative z-10">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 border-surface ${
            current >= 1
              ? 'bg-primary text-white shadow-md'
              : 'bg-surface-container-high text-secondary'
          }`}
        >
          {current >= 2 ? (
            <span className="material-symbols-outlined text-[18px]">check</span>
          ) : (
            1
          )}
        </div>
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 border-surface ${
            current >= 2
              ? 'bg-primary text-white shadow-md'
              : 'bg-surface-container-high text-secondary'
          }`}
        >
          2
        </div>
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 border-surface ${
            current >= 3
              ? 'bg-primary text-white shadow-md'
              : 'bg-surface-container-high text-secondary'
          }`}
        >
          3
        </div>
      </div>
    </div>
  );
}