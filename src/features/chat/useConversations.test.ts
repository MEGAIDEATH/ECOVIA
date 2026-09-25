import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Conversation } from '@/types';

import { useConversations } from './useConversations';

const subscribeMock = vi.hoisted(() => vi.fn());
vi.mock('./conversationRepository', () => ({ subscribeToConversations: subscribeMock }));

const getPublicOrganizationMock = vi.hoisted(() => vi.fn());
const getPublicSpecialistMock = vi.hoisted(() => vi.fn());
vi.mock('@/features/directory/directoryService', () => ({
  getPublicOrganization: getPublicOrganizationMock,
  getPublicSpecialist: getPublicSpecialistMock,
}));

function conversation(chatId: string): Conversation {
  return { chatId, participants: chatId.split('_').slice(1) } as Conversation;
}

describe('useConversations (listener lifecycle)', () => {
  afterEach(() => {
    subscribeMock.mockReset();
    getPublicOrganizationMock.mockReset();
    getPublicSpecialistMock.mockReset();
  });

  it('subscribes once with the uid, resolves the counterpart name, unsubscribes on unmount', async () => {
    const unsub = vi.fn();
    let fire: ((list: Conversation[]) => void) | null = null;
    subscribeMock.mockImplementation((_uid: string, onData: (list: Conversation[]) => void) => {
      fire = onData;
      return unsub;
    });
    getPublicOrganizationMock.mockResolvedValue({ id: 'org-lifecycle-1', orgName: 'Org Alpha' });

    const { result, unmount } = renderHook(() => useConversations('spec-lifecycle-1', 'spec'));

    expect(subscribeMock).toHaveBeenCalledWith(
      'spec-lifecycle-1',
      expect.any(Function),
      expect.any(Function),
    );

    await act(async () => {
      fire?.([conversation('chat_org-lifecycle-1_spec-lifecycle-1')]);
    });

    await waitFor(() => expect(result.current.conversations).toHaveLength(1));
    expect(result.current.conversations[0].otherId).toBe('org-lifecycle-1');
    expect(result.current.conversations[0].otherName).toBe('Org Alpha');
    expect(result.current.loading).toBe(false);

    unmount();
    expect(unsub).toHaveBeenCalledTimes(1);
  });

  it('tears down the previous listener when the uid changes', () => {
    const unsubFirst = vi.fn();
    const unsubSecond = vi.fn();
    subscribeMock.mockReturnValueOnce(unsubFirst).mockReturnValueOnce(unsubSecond);

    const { rerender } = renderHook(
      ({ uid }: { uid: string | null }) => useConversations(uid, 'org'),
      { initialProps: { uid: 'org-1' as string | null } },
    );

    rerender({ uid: 'org-2' });

    expect(unsubFirst).toHaveBeenCalledTimes(1);
    expect(subscribeMock).toHaveBeenCalledTimes(2);
  });

  it('does not subscribe without a uid', () => {
    renderHook(() => useConversations(null, 'spec'));
    expect(subscribeMock).not.toHaveBeenCalled();
  });

  it('ignores a snapshot delivered after unmount (no stale state, no name lookups)', () => {
    let fire: ((list: Conversation[]) => void) | null = null;
    subscribeMock.mockImplementation((_uid: string, onData: (list: Conversation[]) => void) => {
      fire = onData;
      return vi.fn();
    });

    const { result, unmount } = renderHook(() => useConversations('spec-late-1', 'spec'));
    unmount();

    act(() => {
      fire?.([conversation('chat_org-late-1_spec-late-1')]);
    });

    expect(result.current.conversations).toEqual([]);
    expect(getPublicOrganizationMock).not.toHaveBeenCalled();
  });
});
