import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Server-side admin session: an HMAC-signed, expiring cookie value.
 * The admin password itself is only ever compared here, on the server —
 * never in browser code (unlike the legacy `verifyAdmin()`).
 */
export const ADMIN_SESSION_COOKIE = 'baeeyen_admin_session';
export const ADMIN_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // 8 hours

function getAdminPassword(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  return password && password.length > 0 ? password : null;
}

function getSecret(): string | null {
  const configured = process.env.ADMIN_SESSION_SECRET;
  if (configured && configured.length > 0) return configured;
  const password = getAdminPassword();
  return password ? `derived:${password}` : null;
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/** Length-safe constant-time password comparison. */
export function verifyAdminPassword(input: string): boolean {
  const password = getAdminPassword();
  if (!password) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(password);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Creates a signed session token valid for ADMIN_SESSION_MAX_AGE_SECONDS. */
export function createAdminSessionToken(now: number = Date.now()): string {
  const expiresAt = now + ADMIN_SESSION_MAX_AGE_SECONDS * 1000;
  const payload = String(expiresAt);
  const secret = getSecret();
  if (!secret) {
    throw new Error('ADMIN_PASSWORD (or ADMIN_SESSION_SECRET) is not configured on the server.');
  }
  return `${payload}.${sign(payload, secret)}`;
}

/** Verifies signature + expiry of a session token. */
export function verifyAdminSessionToken(
  token: string | undefined | null,
  now: number = Date.now(),
): boolean {
  if (!token) return false;
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return false;
  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const secret = getSecret();
  if (!secret) return false;
  const expected = sign(payload, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!timingSafeEqual(a, b)) return false;
  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt)) return false;
  return expiresAt > now;
}

