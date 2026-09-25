'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface ToastState {
  id: number;
  message: string;
  isError: boolean;
}

interface ToastContextValue {
  /** Legacy-compatible signature: showToast(message, isError = false). */
  showToast: (message: string, isError?: boolean) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_HIDE_MS = 3500;

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [visible, setVisible] = useState(false);
  const autoHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoHide = useCallback(() => {
    if (autoHideRef.current) {
      clearTimeout(autoHideRef.current);
      autoHideRef.current = null;
    }
  }, []);

  const hideToast = useCallback(() => {
    clearAutoHide();
    setVisible(false);
  }, [clearAutoHide]);

  const showToast = useCallback(
    (message: string, isError: boolean = false) => {
      clearAutoHide();
      setToast({ id: Date.now(), message, isError });
      setVisible(false);
      // Trigger the enter transition on the next frame.
      requestAnimationFrame(() => setVisible(true));
      autoHideRef.current = setTimeout(() => setVisible(false), AUTO_HIDE_MS);
    },
    [clearAutoHide],
  );

  // Unmount after the fade-out transition completes.
  useEffect(() => {
    if (!visible && toast) {
      const timer = setTimeout(() => setToast(null), 350);
      return () => clearTimeout(timer);
    }
  }, [visible, toast]);

  useEffect(() => clearAutoHide, [clearAutoHide]);

  const contextValue = useMemo(
    () => ({ showToast, hideToast }),
    [showToast, hideToast],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {toast && (
        <div
          key={toast.id}
          role="alert"
          className={`custom-toast fixed top-6 left-1/2 z-[9999] shadow-2xl rounded-xl p-4 flex items-center gap-3 w-11/12 max-w-md border-l-4 ${
            visible ? 'show' : ''
          } ${toast.isError ? 'bg-red-50 border-red-500' : 'bg-surface border-primary'}`}
        >
          <span
            className={`material-symbols-outlined text-2xl ${
              toast.isError ? 'text-red-500' : 'text-primary'
            }`}
          >
            {toast.isError ? 'error' : 'check_circle'}
          </span>
          <p className="text-on-surface font-semibold text-sm flex-1">{toast.message}</p>
          <button
            type="button"
            onClick={hideToast}
            aria-label="إغلاق الإشعار"
            className="text-secondary hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}
