import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { Spinner } from './Spinner';

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading: boolean;
  /** Text shown while loading (legacy used "جاري..."). */
  loadingLabel?: string;
  /** Show a spinner next to the loading label. */
  showSpinner?: boolean;
  children: ReactNode;
}

/**
 * Button with a built-in loading/disabled state so async failures can always
 * restore the button (never stuck disabled after `loading` flips back).
 */
export function LoadingButton({
  loading,
  loadingLabel = 'جاري...',
  showSpinner = false,
  children,
  disabled,
  className = '',
  ...rest
}: LoadingButtonProps) {
  return (
    <button
      {...rest}
      type={rest.type ?? 'button'}
      disabled={disabled || loading}
      aria-busy={loading}
      className={className}
    >
      {loading ? (
        <span className="inline-flex items-center justify-center gap-2">
          {showSpinner && <Spinner className="w-4 h-4 border-2" />}
          {loadingLabel}
        </span>
      ) : (
        children
      )}
    </button>
  );
}