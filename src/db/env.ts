/**
 * Local environment loader for CLI tooling (drizzle-kit, migrate, seed).
 *
 * Next.js loads `.env.local` itself, but scripts run with `tsx`/`drizzle-kit`
 * do not — so they call `loadLocalEnv()` first. Values already present in
 * `process.env` always win, so shell-provided variables keep precedence.
 * Everything still funnels into the single `DATABASE_URL` variable, which is
 * what a company-owned Neon database provides in production.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvFile(file: string, root: string): void {
  const path = resolve(root, file);
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

/** Reads `.env.local` (preferred) then `.env` from the project root. */
export function loadLocalEnv(root: string = process.cwd()): void {
  loadEnvFile('.env.local', root);
  loadEnvFile('.env', root);
}
