/**
 * Seeds the initial administrator account.
 *
 * - The account is created through Better Auth's own `signUpEmail` API, so the
 *   password is hashed and the `user` / `account` rows are written exactly the
 *   way the production login path expects — nothing is hand-crafted.
 * - The privileged `admin` role is then set server-side from `ADMIN_EMAIL` /
 *   `ADMIN_PASSWORD`; it can never arrive through a request body.
 *
 * Run with `npm run db:seed` after `npm run db:migrate`.
 * The script is idempotent: an existing administrator keeps its password and
 * only has its role re-asserted.
 */
import { eq } from 'drizzle-orm';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { authOptions, authSchema } from '../../lib/auth/options';
import { loadLocalEnv } from '../env';
import { user } from '../schema';

async function main(): Promise<void> {
  loadLocalEnv();

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || connectionString.trim().length === 0) {
    throw new Error('DATABASE_URL is not configured. Copy .env.example to .env.local first.');
  }

  const email = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = (process.env.ADMIN_PASSWORD ?? '').trim();
  const name = (process.env.ADMIN_NAME ?? 'ECOVIA Admin').trim();

  if (!email || !email.includes('@')) {
    throw new Error('ADMIN_EMAIL is not configured. Set it in .env.local.');
  }
  if (password.length < 8) {
    // `emailAndPassword.minPasswordLength` is 8 — fail fast with a clear message.
    throw new Error('ADMIN_PASSWORD must be at least 8 characters long. Set it in .env.local.');
  }

  const pool = new Pool({ connectionString, max: 1 });
  try {
    const db = drizzle(pool);
    const auth = betterAuth({
      ...authOptions,
      database: drizzleAdapter(db, { provider: 'pg', schema: authSchema }),
    });

    const existing = await db.select().from(user).where(eq(user.email, email)).limit(1);
    if (existing.length === 0) {
      await auth.api.signUpEmail({ body: { email, password, name } });
      console.info(`[db:seed] created administrator account ${email}`);
    } else {
      console.info(`[db:seed] administrator ${email} already exists — password unchanged`);
    }

    // `role` is `input: false` in Better Auth options, so it is granted here,
    // server-side, from configuration — never from a request.
    await db.update(user).set({ role: 'admin', updatedAt: new Date() }).where(eq(user.email, email));
    console.info(`[db:seed] ensured role=admin for ${email}`);
    console.info('[db:seed] done.');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[db:seed] failed:', error);
  process.exit(1);
});
