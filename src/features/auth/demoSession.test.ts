import { beforeEach, describe, expect, it, vi } from 'vitest';

import { startFreshDemoSession } from './demoSession';

const firebaseAuthMock = vi.hoisted(() => ({ signOut: vi.fn() }));
vi.mock('firebase/auth', () => firebaseAuthMock);

const clientMock = vi.hoisted(() => ({ getFirebaseAuth: vi.fn() }));
vi.mock('@/lib/firebase/client', () => clientMock);

describe('startFreshDemoSession (demo-only session reset)', () => {
  beforeEach(() => {
    firebaseAuthMock.signOut.mockReset().mockResolvedValue(undefined);
    clientMock.getFirebaseAuth.mockReset().mockReturnValue({ name: 'demo-auth' });
    localStorage.clear();
  });

  it('signs the anonymous user out, clears demo state, then redirects to /', async () => {
    localStorage.setItem('preferredRole', 'spec');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const navigate = vi.fn();

    await startFreshDemoSession(navigate);

    expect(clientMock.getFirebaseAuth).toHaveBeenCalledTimes(1);
    expect(firebaseAuthMock.signOut).toHaveBeenCalledTimes(1);
    // Sign-out must complete before the redirect so the reload cannot restore
    // the previous anonymous UID.
    expect(firebaseAuthMock.signOut.mock.invocationCallOrder[0]).toBeLessThan(
      navigate.mock.invocationCallOrder[0],
    );
    expect(localStorage.getItem('preferredRole')).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/');
    // Never talks to any server, deletes nothing — only the local session.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('propagates sign-out failures without redirecting', async () => {
    firebaseAuthMock.signOut.mockRejectedValue(new Error('network down'));
    const navigate = vi.fn();

    await expect(startFreshDemoSession(navigate)).rejects.toThrow('network down');

    expect(navigate).not.toHaveBeenCalled();
  });
});
