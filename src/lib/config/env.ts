/**
 * Centralized, typed access to environment variables.
 * NEXT_PUBLIC_* values are inlined by Next.js at build time and are safe
 * to read from client components. Non-prefixed values are server-only.
 */

function assert(condition: unknown, name: string): asserts condition {
  if (!condition) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

export interface FirebaseClientEnv {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  appId: string;
}

export function getFirebaseClientEnv(): FirebaseClientEnv {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  assert(apiKey, 'NEXT_PUBLIC_FIREBASE_API_KEY');
  assert(authDomain, 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
  assert(projectId, 'NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  assert(storageBucket, 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
  assert(appId, 'NEXT_PUBLIC_FIREBASE_APP_ID');

  return { apiKey, authDomain, projectId, storageBucket, appId };
}

/**
 * Firestore data namespace used in `artifacts/{DATA_APP_ID}/public/data/...`.
 * The legacy app used `typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'`,
 * so existing data lives under "default-app-id".
 */
export const DATA_APP_ID: string = process.env.NEXT_PUBLIC_DATA_APP_ID || 'default-app-id';

/** Demo OTP shown in the UI and accepted by the demo OTP service. */
export const DEMO_OTP: string = process.env.NEXT_PUBLIC_DEMO_OTP || '123456';

/**
 * Demo-only control ("بدء جلسة تجريبية جديدة") that signs the anonymous demo
 * user out so repeated manual testing can start from a fresh UID. Explicitly
 * opt-in via `NEXT_PUBLIC_DEMO_SESSION_RESET=true` (development/demo config);
 * production builds without the flag never render the control.
 */
export const DEMO_SESSION_RESET_ENABLED: boolean =
  process.env.NEXT_PUBLIC_DEMO_SESSION_RESET === 'true';
