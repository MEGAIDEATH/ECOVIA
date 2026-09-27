import type { BetterAuthOptions } from 'better-auth';
import { emailOTP } from 'better-auth/plugins';

import { account, session, user, verification } from '../../db/schema';

import { deliverOtp, generateOtp } from './otp';

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
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
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
  ],
} satisfies BetterAuthOptions;
