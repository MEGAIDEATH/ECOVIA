 

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

export interface AuthContextValue {
  user: ClientUser | null;
  specialist: Specialist | null;
  organization: Organization | null;
  loading: boolean;
  refresh: () => Promise<ClientUser | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ClientUser | null>(null);
  const [specialist, setSpecialist] = useState<Specialist | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/session').catch(() => null);
    const data = res?.ok ? await res.json().catch(() => null) : null;

    if (data?.authenticated) {
      setUser(data.user);
      setSpecialist(data.specialist);
      setOrganization(data.organization);
      setLoading(false);
      return data.user as ClientUser;
    }

    setUser(null);
    setSpecialist(null);
    setOrganization(null);
    setLoading(false);
    return null;
  }, []);

  useEffect(() => {
    // Bootstrap the session once. `refresh` awaits the network before any
    // setState, so nothing is set synchronously during this commit.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setState runs only after `await fetch`
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ user, specialist, organization, loading, refresh }),
    [user, specialist, organization, loading, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
