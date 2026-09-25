import type { FirebaseOptions } from 'firebase/app';

import { getFirebaseClientEnv } from '@/lib/config/env';

/** Builds the Firebase web configuration from environment variables. */
export function getFirebaseOptions(): FirebaseOptions {
  return getFirebaseClientEnv();
}
