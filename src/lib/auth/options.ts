import type { BetterAuthOptions } from 'better-auth';
import { emailOTP } from 'better-auth/plugins';
import { phoneNumber } from 'better-auth/plugins';

import { account, session, user, verification } from '../../db/schema';

import { deliverOtp, deliverSmsOtp, demoOtpCode, generateOtp, isDemoIdentity } from './otp';

const PHONE_OTP_EXPIRES_IN = 5 * 60;

/** Origins of the current Vercel deployment (empty outside Vercel). */
function vercelOrigins(): string[] {
  return [process.env.VERCEL_BRANCH_URL, process.env.VERCEL_URL]
    .filter((host): host is string => Boolean(host))
    .map((host) => `https://${host}`);
}

interface VerificationAdapter {
  findVerificationValue(identifier: string): Promise<{ expiresAt: Date } | null | undefined>;
  deleteVerificationByIdentifier(identifier: string): Promise<unknown>;
  createVerificationValue(data: {
    identifier: string;
    value: string;
    expiresAt: Date;
  }): Promise<unknown>;
}

/**
 * Replaces the challenge Better Auth just stored for a demo phone number with
 * the configured demo code (same identifier and expiry, attempts reset to 0).
 * Returns the code that is now valid for the identity.
 */
async function applyDemoCodeForPhone(
  phoneNumber: string,
  identifier: string,
  issuedCode: string,
  ctx: unknown,
): Promise<string> {
  if (!isDemoIdentity(phoneNumber)) return issuedCode;
  const adapter = (ctx as { context?: { internalAdapter?: VerificationAdapter } } | undefined)
    ?.context?.internalAdapter;
  if (!adapter) throw new Error('Demo OTP requires the Better Auth endpoint context.');
  const code = demoOtpCode();
  const existing = await adapter.findVerificationValue(identifier);
  const expiresAt = existing?.expiresAt ?? new Date(Date.now() + PHONE_OTP_EXPIRES_IN * 1000);
  await adapter.deleteVerificationByIdentifier(identifier);
  await adapter.createVerificationValue({ identifier, value: `${code}:0`, expiresAt });
  return code;
}

/** Drizzle schema mapping handed to the Better Auth adapter. */
export const authSchema = { user, session, account, verification };

/**
 * Better Auth options shared by the running app (`src/lib/auth/index.ts`) and
 * by CLI tooling such as the seed script, which builds its own instance around
 * a direct database connection. Keeping the options in one place guarantees the
 * seeded administrator is created exactly the way production logins behave.
 *
 * This module intentionally has no `server-only` import so it can be loaded
 * outside of Next.js (tsx scripts).
 *
 * `role` is a server-authoritative additional field with `input: false`: a
 * client can never set it, so a browser cannot promote itself to admin.
 */
export const authOptions = {
  appName: 'ECOVIA',
  baseURL: process.env.BETTER_AUTH_URL ?? vercelOrigins()[0] ?? 'http://localhost:3000',
  // Vercel Preview deployments get per-deployment / per-branch hostnames;
  // trust exactly those (provided by Vercel, never by the client).
  trustedOrigins: vercelOrigins(),
  secret: process.env.BETTER_AUTH_SECRET ?? 'ecovia-development-secret',
  emailAndPassword: {
    enabled: true,
    // The legacy flow never asked users for a password; codes are the primary
    // mechanism and passwords exist for the seeded admin account.
    requireEmailVerification: false,
    minPasswordLength: 8,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'user',
        // Never accept a role from the client — authorization stays server-side.
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh daily
  },
  advanced: {
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 5 * 60,
      allowedAttempts: 5,
      storeOTP: 'hashed',
      generateOTP: generateOtp,
      sendVerificationOTP: async ({ email, otp, type }) => {
        await deliverOtp({ email, otp, type });
      },
    }),
    phoneNumber({
      otpLength: 6,
      expiresIn: PHONE_OTP_EXPIRES_IN,
      allowedAttempts: 5,
      requireVerification: true,
      // Better Auth stores a random code before calling `sendOTP`. For demo
      // identities the stored challenge is swapped for the demo code, so the
      // plugin's own verification (expiry, attempt limit, one-time
      // consumption) still decides. There is deliberately no `verifyOTP`
      // override: that would skip those checks.
      sendOTP: async ({ phoneNumber: targetPhoneNumber, code }, ctx) => {
        const otp = await applyDemoCodeForPhone(targetPhoneNumber, targetPhoneNumber, code, ctx);
        await deliverSmsOtp({ phoneNumber: targetPhoneNumber, otp });
      },
      sendPasswordResetOTP: async ({ phoneNumber: targetPhoneNumber, code }, ctx) => {
        const otp = await applyDemoCodeForPhone(
          targetPhoneNumber,
          `${targetPhoneNumber}-request-password-reset`,
          code,
          ctx,
        );
        await deliverSmsOtp({ phoneNumber: targetPhoneNumber, otp });
      },
      signUpOnVerification: {
        getTempEmail: (targetPhoneNumber) =>
          `${targetPhoneNumber.replace(/[^0-9+]/g, '')}@phone.ecovia.local`,
        getTempName: (targetPhoneNumber) => targetPhoneNumber,
      },
    }),
  ],
} satisfies BetterAuthOptions;
