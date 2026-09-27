import 'server-only';

import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema';

/**
 * Single server-side PostgreSQL connection module.
 *
 * The application depends ONLY on `DATABASE_URL`, so the same code runs against
 * the local Docker database during development and against a company-owned
 * Neon (or any other) PostgreSQL instance in production. `DATABASE_URL` is a
 * server-only secret: it must never be read from client components and must
 * never be exposed with a `NEXT_PUBLIC_` prefix.
 */
export type Database = NodePgDatabase<typeof schema>;

export class DatabaseConfigError extends Error {
  constructor() {
    super('DATABASE_URL is not configured on the server.');
    this.name = 'DatabaseConfigError';
  }
}

let pool: Pool | null = null;
let database: Database | null = null;

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url || url.trim().length === 0) throw new DatabaseConfigError();
  return url;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
}

function createPool(): Pool {
  // `sslmode=require` (Neon and most managed providers) is honoured by pg
  // directly from the connection string — no provider-specific branches here.
  return new Pool({
    connectionString: getDatabaseUrl(),
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

export function getPool(): Pool {
  if (!pool) pool = createPool();
  return pool;
}

export function getDb(): Database {
  if (!database) database = drizzle(getPool(), { schema });
  return database;
}

/** Closes the pool (scripts and tests only — the app keeps it for its lifetime). */
export async function closeDb(): Promise<void> {
  if (!pool) return;
  const current = pool;
  pool = null;
  database = null;
  await current.end();
}

export { schema };
