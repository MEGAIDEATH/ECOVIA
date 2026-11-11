import 'server-only';

import { createHash } from 'node:crypto';

import { sql } from 'drizzle-orm';

import { getDb } from '@/db';

/**
 * Fixed-window rate limits for OTP endpoints, stored in PostgreSQL so every
 * serverless instance sees the same counters (Better Auth's built-in limiter
 * only guards its own HTTP handler and defaults to in-memory storage).
 */
export interface RateLimitRule {
  scope: string;
  max: number;
  windowSeconds: number;
}

const FIFTEEN_MINUTES = 15 * 60;

export const OTP_RATE_LIMITS = {
  sendPerIdentity: { scope: 'otp-send-id', max: 5, windowSeconds: FIFTEEN_MINUTES },
  sendPerIp: { scope: 'otp-send-ip', max: 60, windowSeconds: FIFTEEN_MINUTES },
  verifyPerIdentity: { scope: 'otp-verify-id', max: 10, windowSeconds: FIFTEEN_MINUTES },
  verifyPerIp: { scope: 'otp-verify-ip', max: 120, windowSeconds: FIFTEEN_MINUTES },
} satisfies Record<string, RateLimitRule>;

export class RateLimitError extends Error {
  constructor() {
    super('محاولات كثيرة، يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.');
    this.name = 'RateLimitError';
  }
}

function keyFor(rule: RateLimitRule, subject: string): string {
  const digest = createHash('sha256').update(subject.trim().toLowerCase()).digest('hex');
  return `${rule.scope}:${digest}`;
}

/** Counts one hit; returns false when the window's budget is exhausted. */
export async function consumeRateLimit(rule: RateLimitRule, subject: string): Promise<boolean> {
  const key = keyFor(rule, subject);
  const window = rule.windowSeconds;
  const result = await getDb().execute<{ count: number }>(sql`
    insert into otp_rate_limit (key, count, window_start)
    values (${key}, 1, now())
    on conflict (key) do update set
      count = case
        when otp_rate_limit.window_start < now() - make_interval(secs => ${window}) then 1
        else otp_rate_limit.count + 1
      end,
      window_start = case
        when otp_rate_limit.window_start < now() - make_interval(secs => ${window}) then now()
        else otp_rate_limit.window_start
      end
    returning count
  `);
  const count = Number(result.rows[0]?.count ?? 0);
  return count <= rule.max;
}

/** Client IP as reported by the platform proxy (Vercel sets x-forwarded-for). */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || headers.get('x-real-ip')?.trim() || 'unknown';
}

/** Throws `RateLimitError` when either the identity or the IP is over budget. */
export async function enforceOtpRateLimit(
  kind: 'send' | 'verify',
  identity: string,
  headers: Headers,
): Promise<void> {
  const [identityRule, ipRule] =
    kind === 'send'
      ? [OTP_RATE_LIMITS.sendPerIdentity, OTP_RATE_LIMITS.sendPerIp]
      : [OTP_RATE_LIMITS.verifyPerIdentity, OTP_RATE_LIMITS.verifyPerIp];
  const [identityOk, ipOk] = await Promise.all([
    consumeRateLimit(identityRule, identity),
    consumeRateLimit(ipRule, clientIp(headers)),
  ]);
  if (!identityOk || !ipOk) throw new RateLimitError();
}
