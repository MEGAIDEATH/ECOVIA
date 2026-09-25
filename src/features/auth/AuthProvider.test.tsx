import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider, useAuth } from './AuthProvider';

const authEmitters = vi.hoisted(() => ({
  next: null as ((user: unknown) => void) | null,
  error: null as ((error: unknown) => void) | null,
}));

const onAuthStateChangedMock = vi.hoisted(() => vi.fn());
vi.mock('firebase/auth', () => ({ onAuthStateChanged: onAuthStateChangedMock }));

const clientMock = vi.hoisted(() => ({
  ensureAnonymousAuth: vi.fn(),
  getFirebaseAuth: vi.fn(),
}));
vi.mock('@/lib/firebase/client', () => clientMock);

/** Renders the resolved auth state as plain text for assertions. */
function AuthStateProbe() {
  const { user, loading } = useAuth();
  return <div data-testid="auth-state">{loading ? 'loading' : user ? user.uid : 'none'}</div>;
}

describe('AuthProvider (anonymous session bootstrap)', () => {
  beforeEach(() => {
    authEmitters.next = null;
    authEmitters.error = null;
    onAuthStateChangedMock.mockReset().mockImplementation(
      (_auth: unknown, next: (user: unknown) => void, error: (err: unknown) => void) => {
        authEmitters.next = next;
        authEmitters.error = error;
        return () => undefined;
      },
    );
    clientMock.getFirebaseAuth.mockReset().mockReturnValue({ name: 'demo-auth' });
    clientMock.ensureAnonymousAuth.mockReset().mockResolvedValue({ uid: 'fresh-uid' });
  });

  it('creates the anonymous session only when the initial state has no user', async () => {
    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>,
    );
    expect(screen.getByTestId('auth-state')).toHaveTextContent('loading');
    expect(clientMock.ensureAnonymousAuth).not.toHaveBeenCalled();

    await act(async () => {
      authEmitters.next?.(null);
    });

    expect(clientMock.ensureAnonymousAuth).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('auth-state')).toHaveTextContent('fresh-uid');
  });

  it('reuses an existing session and never signs in again', async () => {
    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>,
    );

    await act(async () => {
      authEmitters.next?.({ uid: 'existing-uid' });
    });

    expect(screen.getByTestId('auth-state')).toHaveTextContent('existing-uid');
    expect(clientMock.ensureAnonymousAuth).not.toHaveBeenCalled();
  });

  it('keeps a persisted session usable across a provider remount', async () => {
    const first = render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>,
    );
    await act(async () => {
      authEmitters.next?.({ uid: 'persisted-uid' });
    });
    first.unmount();

    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>,
    );
    await act(async () => {
      authEmitters.next?.({ uid: 'persisted-uid' });
    });

    expect(screen.getByTestId('auth-state')).toHaveTextContent('persisted-uid');
    expect(clientMock.ensureAnonymousAuth).not.toHaveBeenCalled();
  });

  it('stops loading when the auth listener reports an error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>,
    );

    await act(async () => {
      authEmitters.error?.(new Error('listener failed'));
    });

    expect(screen.getByTestId('auth-state')).toHaveTextContent('none');
    expect(clientMock.ensureAnonymousAuth).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
