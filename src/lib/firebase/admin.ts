import 'server-only';

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';

/**
 * Server-only Firebase Admin SDK. This module must NEVER be imported from a
 * client component — it holds privileged credentials.
 *
 * Credentials are resolved from:
 *   1. FIREBASE_SERVICE_ACCOUNT — a JSON string of a service account,
 *   2. GOOGLE_APPLICATION_CREDENTIALS — an explicit ADC key file, or
 *   3. FIRESTORE_EMULATOR_HOST — the local emulator suite.
 *
 * When none of these is configured the module throws immediately instead of
 * falling back to an implicit metadata-server lookup (which rejects
 * asynchronously and used to surface as an unhandled rejection).
 */
export class FirebaseAdminConfigError extends Error {
  constructor() {
    super(
      'Firebase Admin credentials are not configured (set FIREBASE_SERVICE_ACCOUNT, ' +
        'GOOGLE_APPLICATION_CREDENTIALS, or FIRESTORE_EMULATOR_HOST).',
    );
    this.name = 'FirebaseAdminConfigError';
  }
}

let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminStorage: Storage | null = null;

function createAdminApp(): App {
  const existing = getApps();
  if (existing.length > 0) return existing[0];

  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      return initializeApp({ credential: cert(parsed as object), storageBucket });
    } catch (error) {
      console.error('[firebase/admin] FIREBASE_SERVICE_ACCOUNT is not valid JSON:', error);
      throw new Error('FIREBASE_SERVICE_ACCOUNT is not a valid service account JSON string.');
    }
  }

  const hasAdcFile = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  if (hasAdcFile || hasEmulator) {
    return initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket,
    });
  }

  throw new FirebaseAdminConfigError();
}

export function getAdminApp(): App {
  if (!adminApp) adminApp = createAdminApp();
  return adminApp;
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminAuth(): Auth {
  if (!adminAuth) adminAuth = getAuth(getAdminApp());
  return adminAuth;
}

export function getAdminStorage(): Storage {
  if (!adminStorage) {
    const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucket) throw new FirebaseAdminConfigError();
    adminStorage = getStorage(getAdminApp());
  }
  return adminStorage;
}
