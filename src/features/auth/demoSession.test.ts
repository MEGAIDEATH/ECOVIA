import { beforeEach, describe, expect, it, vi } from 'vitest';

import { startFreshDemoSession } from './demoSession';

describe('startFreshDemoSession (demo-only session reset)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('calls the server logout endpoint, clears demo state, then redirects to /', async () => {
    localStorage.setItem('preferredRole', 'spec');
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const navigate = vi.fn();

    await startFreshDemoSession(navigate);

    expect(fetchSpy).toHaveBeenCalledWith('/api/session/logout', { method: 'POST' });
    expect(localStorage.getItem('preferredRole')).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('still clears demo state and redirects when the logout call fails', async () => {
    localStorage.setItem('preferredRole', 'org');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));
    const navigate = vi.fn();

    await startFreshDemoSession(navigate);

    expect(localStorage.getItem('preferredRole')).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/');
  });
});
