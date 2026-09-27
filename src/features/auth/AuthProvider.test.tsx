import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider, useAuth } from './AuthProvider';

const sessionPayload = vi.hoisted(() => ({
  body: {
    authenticated: true,
    user: { id: 'user-1', email: 'spec@example.com', name: 'Spec', role: 'user' },
    specialist: null,
    organization: null,
  } as unknown,
  ok: true,
}));

function mockSession(body: unknown, ok = true): void {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), { status: ok ? 200 : 401 }),
  );
}

/** Renders the resolved auth state as plain text for assertions. */
function AuthStateProbe() {
  const { user, loading } = useAuth();
  return <div data-testid="auth-state">{loading ? 'loading' : user ? user.id : 'none'}</div>;
}

describe('AuthProvider (database-backed session bootstrap)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionPayload.ok = true;
    sessionPayload.body = {
      authenticated: true,
      user: { id: 'user-1', email: 'spec@example.com', name: 'Spec', role: 'user' },
      specialist: null,
      organization: null,
    };
    mockSession(sessionPayload.body, true);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input) === '/api/session') {
        return new Response(JSON.stringify(sessionPayload.body), {
          status: sessionPayload.ok ? 200 : 401,
        });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    });
  });

  it('loads the authenticated user from the server session on mount', async () => {
    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>,
    );
    expect(screen.getByTestId('auth-state')).toHaveTextContent('loading');

    await act(async () => {
      await Promise.resolve();
    });

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/session');
    expect(screen.getByTestId('auth-state')).toHaveTextContent('user-1');
  });

  it('reports no user when the server says the session is unauthenticated', async () => {
    sessionPayload.body = { authenticated: false, user: null, specialist: null, organization: null };

    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId('auth-state')).toHaveTextContent('none');
  });

  it('stops loading when the session request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));

    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId('auth-state')).toHaveTextContent('none');
  });

  it('refreshes the session on demand', async () => {
    function RefreshProbe() {
      const { refresh, user } = useAuth();
      return (
        <button type="button" data-testid="refresh" onClick={() => void refresh()}>
          {user ? user.id : 'none'}
        </button>
      );
    }

    render(
      <AuthProvider>
        <RefreshProbe />
      </AuthProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    sessionPayload.body = {
      authenticated: true,
      user: { id: 'user-2', email: 'org@example.com', name: 'Org', role: 'user' },
      specialist: null,
      organization: null,
    };

    await act(async () => {
      screen.getByTestId('refresh').click();
      await Promise.resolve();
    });

    expect(screen.getByTestId('refresh')).toHaveTextContent('user-2');
  });
});
