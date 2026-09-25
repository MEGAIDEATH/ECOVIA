import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useApprovalListener } from './useApprovalListener';

interface SnapshotLike {
  exists: () => boolean;
  data: () => unknown;
}

const onSnapshotMock = vi.hoisted(() => vi.fn());
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'doc-ref'),
  onSnapshot: onSnapshotMock,
}));

vi.mock('@/lib/firebase/client', () => ({
  getDb: vi.fn(() => ({})),
}));

function captureListener() {
  const holder: { fire?: (snapshot: SnapshotLike) => void } = {};
  onSnapshotMock.mockImplementation(
    (_ref: unknown, onNext: (snapshot: SnapshotLike) => void) => {
      holder.fire = onNext;
      return vi.fn();
    },
  );
  return holder;
}

describe('useApprovalListener', () => {
  afterEach(() => {
    onSnapshotMock.mockReset();
  });

  it('subscribes to the account document and fires on approval exactly once', () => {
    const unsub = vi.fn();
    const holder: { fire?: (snapshot: SnapshotLike) => void } = {};
    onSnapshotMock.mockImplementation(
      (_ref: unknown, onNext: (snapshot: SnapshotLike) => void) => {
        holder.fire = onNext;
        return unsub;
      },
    );

    const onApproved = vi.fn();
    const { unmount } = renderHook(() => useApprovalListener('uid-1', 'spec', onApproved));
    expect(onSnapshotMock).toHaveBeenCalledTimes(1);

    holder.fire?.({ exists: () => true, data: () => ({ status: 'approved' }) });
    expect(onApproved).toHaveBeenCalledTimes(1);

    // Extra snapshots must not re-trigger (avoid duplicate redirects/toasts).
    holder.fire?.({ exists: () => true, data: () => ({ status: 'approved' }) });
    expect(onApproved).toHaveBeenCalledTimes(1);

    unmount();
    expect(unsub).toHaveBeenCalledTimes(1);
  });

  it('does not fire while still pending', () => {
    const holder = captureListener();
    const onApproved = vi.fn();
    renderHook(() => useApprovalListener('uid-1', 'org', onApproved));
    holder.fire?.({ exists: () => true, data: () => ({ status: 'pending' }) });
    expect(onApproved).not.toHaveBeenCalled();
  });

  it('does not subscribe without uid or role', () => {
    renderHook(() => useApprovalListener(null, 'spec', vi.fn()));
    renderHook(() => useApprovalListener('uid-1', null, vi.fn()));
    expect(onSnapshotMock).not.toHaveBeenCalled();
  });
});