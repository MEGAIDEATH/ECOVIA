/**
 * Centralized, typed access to application environment variables.
 * NEXT_PUBLIC_* values are inlined by Next.js at build time.
 * Non-prefixed values are strictly server-only.
 */

/**
 * Demo-only control ("بدء جلسة تجريبية جديدة") that resets the session
 * for rapid repeated manual testing.
 */
export const DEMO_SESSION_RESET_ENABLED: boolean =
  process.env.NEXT_PUBLIC_DEMO_SESSION_RESET === 'true';
