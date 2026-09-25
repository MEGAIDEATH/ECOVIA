'use client';

import { onAuthStateChanged } from 'firebase/auth';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { ensureAnonymousAuth, getFirebaseAuth } from '@/lib/firebase/client';

interface AuthContextValue {
  user: import('firebase/auth').User | null;
  /** True until the anonymous session is resolved (or sign-in failed). */
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Resolves the Firebase session exactly like the legacy app: the user is
 * signed in anonymously at startup and the resulting UID keys all documents.
 * (Logout intentionally does NOT sign out — the legacy behavior kept the
 * same anonymous UID across logout/login so users return to their account.)
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthContextValue['user']>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(
      auth,
      (nextUser) => {
        if (cancelled) return;
        if (nextUser) {
          // Existing (persisted) anonymous session — reuse it as-is.
          setUser(nextUser);
          setLoading(false);
          return;
        }
        // Initial signed-out emission: only now do we create a session, so a
        // restored UID is never replaced by a fresh one. `ensureAnonymousAuth`
        // also de-duplicates concurrent callers (React Strict Mode double
        // mount), so exactly one anonymous session is created per browser.
        ensureAnonymousAuth()
          .then((signedInUser) => {
            if (cancelled) return;
            setUser(signedInUser);
            setLoading(false);
          })
          .catch((error: unknown) => {
            console.error('[auth] anonymous sign-in failed:', error);
            if (!cancelled) setLoading(false);
          });
      },
      (error) => {
        console.error('[auth] onAuthStateChanged error:', error);
        if (!cancelled) setLoading(false);
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const contextValue = useMemo(() => ({ user, loading }), [user, loading]);

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}