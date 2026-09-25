import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  type Auth,
  type User,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

import { getFirebaseOptions } from './config';

/**
 * Lazy Firebase client singletons. Never import these at module scope of a
 * server component — call them from client code (hooks/repositories) instead.
 */
let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  const existing = getApps();
  app = existing[0] ?? initializeApp(getFirebaseOptions());
  return app;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

export function getFirebaseStorage(): FirebaseStorage {
  return getStorage(getFirebaseApp());
}

/**
 * In-flight anonymous sign-in, shared by every concurrent caller. React
 * Strict Mode mounts effects twice, and several features may ask for the
 * session during startup — without this guard each of them could start its
 * own `signInAnonymously` and mint duplicate UIDs.
 */
let anonymousSignInInFlight: Promise<User> | null = null;

/**
 * Signs the user in anonymously (legacy demo authentication) and returns the
 * resulting user. Resolves immediately when a session already exists, and
 * de-duplicates concurrent sign-in attempts so exactly one session is created.
 */
export async function ensureAnonymousAuth(): Promise<User> {
  const auth = getFirebaseAuth();
  if (auth.currentUser) return auth.currentUser;
  if (!anonymousSignInInFlight) {
    anonymousSignInInFlight = signInAnonymously(auth)
      .then((credential) => credential.user)
      .finally(() => {
        anonymousSignInInFlight = null;
      });
  }
  return anonymousSignInInFlight;
}

/** Waits (once) for the auth state to be ready — mirrors Firebase's initial resolve. */
export function waitForAuthReady(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth.currentUser) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const unsub = auth.onAuthStateChanged(
      () => {
        unsub();
        resolve();
      },
      (error) => {
        unsub();
        reject(error);
      },
    );
  });
}
