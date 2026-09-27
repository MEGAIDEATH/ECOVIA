import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useApprovalListener } from './useApprovalListener';

function mockSession(status: 'pending' | 'approved' | 'none'): void {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    if (status === 'none') {
      return new Response(
        JSON.stringify({ authenticated: false, user: null, specialist: null, organization: null }),
        { status: 200 },
      );
    }
    const profile = { id: 'p1', userId: 'uid-1', status };
    return new Response(
      JSON.stringify({
        authenticated: true,
        user: { id: 'uid-1', email: 'a@b.c', name: 'A', role: 'user' },
        specialist: profile,
        organization: null,
      }),
      { status: 200 },
    );
  });
}

describe('useApprovalListener (session polling)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
  });

  it('fires on approval exactly once and then stops polling', async () => {
    mockSession('approved');
    const onApproved = vi.fn();
    const { unmount } = renderHook(() => useApprovalListener('uid-1', 'spec', onApproved));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2600);
    });

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/session');
    expect(onApproved).toHaveBeenCalledTimes(1);

    // Extra intervals must not re-trigger (avoid duplicate redirects/toasts).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(onApproved).toHaveBeenCalledTimes(1);

    unmount();
    vi.useRealTimers();
  });

  it('does not fire while still pending', async () => {
    mockSession('pending');
    const onApproved = vi.fn();
    const { unmount } = renderHook(() => useApprovalListener('uid-1', 'org', onApproved));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8000);
    });

    expect(onApproved).not.toHaveBeenCalled();
    unmount();
    vi.useRealTimers();
  });

  it('does not poll without uid or role', async () => {
    mockSession('approved');
    const first = renderHook(() => useApprovalListener(null, 'spec', vi.fn()));
    const second = renderHook(() => useApprovalListener('uid-1', null, vi.fn()));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8000);
    });

    expect(globalThis.fetch).not.toHaveBeenCalled();
    first.unmount();
    second.unmount();
    vi.useRealTimers();
  });
});