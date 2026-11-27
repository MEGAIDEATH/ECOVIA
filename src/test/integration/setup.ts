import { readFileSync } from 'node:fs';

/**
 * Refuses to run integration tests anywhere but an explicitly provided,
 * disposable database: INTEGRATION_DATABASE_URL must be set and must not be
 * the developer's DATABASE_URL from .env.local (never pollute dev data).
 */
const target = process.env.INTEGRATION_DATABASE_URL;
if (!target) {
  throw new Error('Set INTEGRATION_DATABASE_URL to a disposable database (e.g. a throwaway Neon branch).');
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace('-pooler', '');
  } catch {
    return url;
  }
}

try {
  const local = readFileSync('.env.local', 'utf8').match(/^DATABASE_URL="?([^"\n]+)"?/m)?.[1];
  if (local && hostOf(local) === hostOf(target)) {
    throw new Error('INTEGRATION_DATABASE_URL points at the development database from .env.local — refusing.');
  }
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

process.env.DATABASE_URL = target;
