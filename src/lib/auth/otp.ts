/**
 * One-time code delivery for the sign-in / registration verification step.
 *
 * Development: a fixed, well-known code (the legacy demo code, `123456` by
 * default) is generated so the whole flow works without an external provider.
 * Production: a random 6-digit code is generated and MUST be delivered by the
 * configured provider — no development code is ever accepted in production.
 */
export function isProduction(): boolean {
  // `next start` (used by the E2E webServer) always runs with
  // NODE_ENV=production, so the dev-OTP path needs an explicit opt-in flag
  // for local demo/E2E runs. Real deployments stay locked to production.
  return (
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PUBLIC_ALLOW_DEV_OTP !== 'true'
  );
}

/** Development-only code. Never used when NODE_ENV === 'production'. */
export function developmentOtpCode(): string {
  const configured = process.env.DEV_OTP_CODE;
  return configured && /^\d{6}$/.test(configured) ? configured : '123456';
}

/**
 * Returns the code to generate, or `undefined` to let Better Auth generate a
 * cryptographically random code (the production path).
 */
export function generateOtp(): string | undefined {
  return isProduction() ? undefined : developmentOtpCode();
}

export interface OtpDelivery {
  email: string;
  otp: string;
  type: string;
}

export interface SmsOtpDelivery {
  phoneNumber: string;
  otp: string;
}

/**
 * Delivers a code. Today the "provider" is the server log (development only);
 * swapping in SMTP/an SMS gateway later means changing only this function.
 * In development the code is also echoed to the log so the flow is testable.
 */
export async function deliverOtp({ email, otp, type }: OtpDelivery): Promise<void> {
  if (isProduction()) {
    // Production delivery is intentionally not implemented yet: the platform
    // owner must configure a real provider before go-live. Failing loudly is
    // safer than silently accepting development codes in production.
    throw new Error(
      'OTP delivery is not configured. Set up an email/SMS provider before running in production.',
    );
  }
  console.info(`[auth:otp] ${type} code for ${email}: ${otp} (development only)`);
}

/**
 * SMS delivery adapter. In development the code is logged; in production a real
 * provider must be configured. The function never reports delivery success when
 * only the development mock ran.
 */
export async function deliverSmsOtp({ phoneNumber, otp }: SmsOtpDelivery): Promise<void> {
  if (isProduction()) {
    throw new Error(
      'SMS delivery is not configured. Set up an SMS provider before running in production.',
    );
  }
  console.info(`[auth:sms] code for ${phoneNumber}: ${otp} (development only)`);
}
