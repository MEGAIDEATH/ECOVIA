import { defineConfig } from 'drizzle-kit';

import { loadLocalEnv } from './src/db/env';

/**
 * drizzle-kit configuration.
 *
 * CLI commands (`npm run db:*`) run outside Next.js, so the local `.env.local`
 * / `.env` files are loaded here explicitly (shared with the migrate/seed
 * scripts).
 */
loadLocalEnv();

const LOCAL_FALLBACK =
  'postgres://ecovia:ecovia_dev_password@localhost:5432/ecovia_dev';

export default defineConfig({
  schema: './src/db/schema/*.ts',
  out: './drizzle',
  dialect: 'postgresql',
  strict: true,
  verbose: true,
  dbCredentials: {
    url: process.env.DATABASE_URL ?? LOCAL_FALLBACK,
  },
});

