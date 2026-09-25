import { beforeEach, describe, expect, it, vi } from 'vitest';

const firebaseAppMock = vi.hoisted(() => ({
  getApps: vi.fn(() => []),
  initializeApp: vi.fn(() => ({ name: 'app' })),
}));
vi.mock('firebase/app', () => firebaseAppMock);

const firebaseAuthMock = vi.hoisted(() => {
  const state: { currentUser: { uid: string } | null } = { currentUser: null };
  return {
    state,
    getAuth: vi.fn(() => state),
    signInAnonymously: vi.fn(),
  };
});
vi.mock('firebase/auth', () => ({
  getAuth: firebaseAuthMock.getAuth,
  signInAnonymously: firebaseAuthMock.signInAnonymously,
}));
vi.mock('firebase/firestore', () => ({ getFirestore: vi.fn(() => ({})) }));
vi.mock('firebase/storage', () => ({ getStorage: vi.fn(() => ({})) }));
vi.mock('./config', () => ({ getFirebaseOptions: () => ({}) }));

describe('ensureAnonymousAuth (anonymous session bootstrap)', () => {
  beforeEach(async () => {
    // Fresh module instance per test: `ensureAnonymousAuth` keeps a module-level
    // in-flight promise that must not leak between tests.
    vi.resetModules();
    firebaseAuthMock.state.currentUser = null;
    firebaseAuthMock.signInAnonymously.mockReset().mockImplementation(async () => {
      firebaseAuthMock.state.currentUser = { uid: 'fresh-uid' };
      return { user: firebaseAuthMock.state.currentUser };
    });
  });

  it('reuses an existing session without signing in again', async () => {
    firebaseAuthMock.state.currentUser = { uid: 'existing-uid' };
    const { ensureAnonymousAuth } = await import('./client');

    const user = await ensureAnonymousAuth();

    expect(user.uid).toBe('existing-uid');
    expect(firebaseAuthMock.signInAnonymously).not.toHaveBeenCalled();
  });

  it('creates exactly one anonymous session for concurrent callers (Strict Mode safe)', async () => {
    const { ensureAnonymousAuth } = await import('./client');

    const [first, second] = await Promise.all([
      ensureAnonymousAuth(),
      ensureAnonymousAuth(),
    ]);

    expect(firebaseAuthMock.signInAnonymously).toHaveBeenCalledTimes(1);
    expect(first.uid).toBe('fresh-uid');
    expect(second.uid).toBe('fresh-uid');
  });

  it('returns the same (persisted) UID on later calls — sessions stay usable', async () => {
    const { ensureAnonymousAuth } = await import('./client');
    await ensureAnonymousAuth();
    firebaseAuthMock.signInAnonymously.mockClear();

    const user = await ensureAnonymousAuth();

    expect(user.uid).toBe('fresh-uid');
    expect(firebaseAuthMock.signInAnonymously).not.toHaveBeenCalled();
  });

  it('starts a brand-new session after the previous one was signed out', async () => {
    const { ensureAnonymousAuth } = await import('./client');
    await ensureAnonymousAuth();

    // Simulate the demo session reset: signOut clears currentUser.
    firebaseAuthMock.state.currentUser = null;
    const user = await ensureAnonymousAuth();

    expect(firebaseAuthMock.signInAnonymously).toHaveBeenCalledTimes(2);
    expect(user.uid).toBe('fresh-uid');
  });
});
