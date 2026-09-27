import 'server-only';

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import { getDb } from '@/db';

import { authOptions, authSchema } from './options';

/**
 * Better Auth instance backed by PostgreSQL (Drizzle).
 *
 * Authentication data lives entirely in the database: `user`, `session`,
 * `account` and `verification`. Sign-in uses an emailed/SMS one-time code
 * (`emailOTP` plugin), which preserves the application's existing
 * "enter the 6-digit code" verification step, while `emailAndPassword` stays
 * enabled for the seeded administrator account and future real logins.
 *
 * The shared options live in `./options.ts` (also used by the seed script),
 * which is free of `server-only` so CLI tooling can construct an identical
 * instance. The instance is created lazily so importing a route module during
 * `next build` never opens a database connection.
 *
 * `createAuth`'s return type carries the exact options (including plugins), so
 * `auth.api.sendVerificationOTP` / `auth.api.signInEmailOTP` are typed — a
 * widened `Auth<BetterAuthOptions>` would hide the plugin routes.
 */
function createAuth() {
  return betterAuth({
    ...authOptions,
    database: drizzleAdapter(getDb(), {
      provider: 'pg',
      schema: authSchema,
    }),
  });
}

type AuthInstance = ReturnType<typeof createAuth>;

let instance: AuthInstance | null = null;

export function getAuth(): AuthInstance {
  if (instance) return instance;

  instance = createAuth();
  return instance;
}

