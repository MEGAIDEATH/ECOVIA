'use client';

import { useEffect, useRef, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}

export const OTP_LENGTH = 6;

/**
 * Six single-digit inputs with legacy behavior:
 * - one character max, auto-focus next on input
 * - Backspace on empty focuses the previous box
 * - (addition) pasting a full code distributes the digits
 */
export function OtpInput({ value, onChange, disabled = false }: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] ?? '');

  useEffect(() => {
    // Keep refs sized to the fixed OTP length.
    refs.current.length = OTP_LENGTH;
  }, []);

  const setDigit = (index: number, digit: string) => {
    const next = [...digits];
    next[index] = digit;
    onChange(next.join(''));
  };

  const handleInput = (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value.replace(/\D/g, '');
    if (!raw) {
      setDigit(index, '');
      return;
    }
    // One-character input behavior (legacy sliced longer values).
    setDigit(index, raw[0]);
    if (index < OTP_LENGTH - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    event.preventDefault();
    onChange(pasted);
    refs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  return (
    <div className="flex gap-2 sm:gap-3 mb-8" dir="ltr">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={`خانة الرمز ${index + 1}`}
          value={digit}
          disabled={disabled}
          onChange={handleInput(index)}
          onKeyDown={handleKeyDown(index)}
          onPaste={index === 0 ? handlePaste : undefined}
          className="otp-input w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold bg-white border-2 border-outline-variant rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
        />
      ))}
    </div>
  );
}