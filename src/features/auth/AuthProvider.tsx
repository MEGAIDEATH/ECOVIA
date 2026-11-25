'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { Organization, Specialist } from '@/types';

export interface ClientUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface ClientSession {
  user: ClientUser | null;
  specialist: Specialist | null;
  organization: Organization | null;
}

export interface AuthContextValue extends ClientSession {
  loading: boolean;
  refresh: () => Promise<ClientUser | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

/**
 * Client view of the session.
 * - With `initial` (workspace layouts): the server already resolved the
 *   session, so nothing is fetched — client islands just read it.
 * - Without it (auth screens): bootstraps once from GET /api/session.
 * Authorization never depends on this context; it is display state only.
 */
export function AuthProvider({ children, initial }: { children: ReactNode; initial?: ClientSession }) {
  const [session, setSession] = useState<ClientSession>(
    initial ?? { user: null, specialist: null, organization: null },
  );
  const [loading, setLoading] = useState(!initial);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/session').catch(() => null);
    const data = res?.ok ? await res.json().catch(() => null) : null;
    const next: ClientSession = data?.authenticated
      ? { user: data.user, specialist: data.specialist, organization: data.organization }
      : { user: null, specialist: null, organization: null };
    setSession(next);
    setLoading(false);
    return next.user;
  }, []);

  useEffect(() => {
    if (initial) return;
    // `refresh` awaits the network before any setState, so nothing is set
    // synchronously during this commit.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setState runs only after `await fetch`
    void refresh();
  }, [initial, refresh]);

  const value = useMemo(() => ({ ...session, loading, refresh }), [session, loading, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
