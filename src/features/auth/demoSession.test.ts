import { describe, expect, it, vi } from 'vitest';

import { startFreshDemoSession } from './demoSession';

describe('startFreshDemoSession (demo-only session reset)', () => {
  it('calls the server logout endpoint, then redirects to /', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const navigate = vi.fn();

    await startFreshDemoSession(navigate);

    expect(fetchSpy).toHaveBeenCalledWith('/api/session/logout', { method: 'POST' });
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('still redirects when the logout call fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));
    const navigate = vi.fn();

    await startFreshDemoSession(navigate);

    expect(navigate).toHaveBeenCalledWith('/');
  });
});
