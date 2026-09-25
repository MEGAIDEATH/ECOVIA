import { DEMO_OTP } from '@/lib/config/env';

/** Thrown when the OTP verification service rejects a code. */
export class InvalidOtpError extends Error {
  constructor(message = 'رمز التحقق غير صحيح!') {
    super(message);
    this.name = 'InvalidOtpError';
  }
}

/**
 * Abstraction over phone verification. The current implementation is a local
 * demo service (the legacy app told users to type 123456) — it can later be
 * replaced with a real SMS provider without touching UI code.
 */
export interface OtpService {
  verify(code: string): Promise<void>;
}

export const demoOtpService: OtpService = {
  async verify(code: string): Promise<void> {
    if (code !== DEMO_OTP) {
      throw new InvalidOtpError();
    }
  },
};

/** Active OTP implementation. Swap here when real phone verification lands. */
export function getOtpService(): OtpService {
  return demoOtpService;
}
