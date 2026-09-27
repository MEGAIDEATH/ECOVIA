/**
 * Applies every generated Drizzle migration (see `drizzle/`) to the database
 * in `DATABASE_URL`. Run with `npm run db:migrate` after `npm run db:generate`.
 *
 * The script is deliberately self-contained (only `pg`, `drizzle-orm` and the
 * local schema) so it runs outside Next.js without the `server-only` guards.
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

import { loadLocalEnv } from './env';

async function main(): Promise<void> {
  loadLocalEnv();

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || connectionString.trim().length === 0) {
    throw new Error('DATABASE_URL is not configured. Copy .env.example to .env.local first.');
  }

  const pool = new Pool({ connectionString, max: 1 });
  try {
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: './drizzle' });
    console.info('[db:migrate] all migrations applied.');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[db:migrate] failed:', error);
  process.exit(1);
});
