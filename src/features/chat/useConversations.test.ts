import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Conversation } from '@/types';

import { useConversations } from './useConversations';

const fetchConversationsMock = vi.hoisted(() => vi.fn());
vi.mock('./conversationRepository', () => ({
  fetchConversations: fetchConversationsMock,
}));

function conversation(chatId: string): Conversation {
  return { chatId, participants: chatId.split('_').slice(1) } as Conversation;
}

beforeEach(() => {
  fetchConversationsMock.mockReset().mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useConversations', () => {
  it('loads conversations and resolves the counterpart for the specialist side', async () => {
    fetchConversationsMock.mockResolvedValue([conversation('chat_org-1_spec-1')]);

    const { result, unmount } = renderHook(() => useConversations('spec-1', 'spec'));

    await waitFor(() => expect(result.current.conversations).toHaveLength(1));
    expect(fetchConversationsMock).toHaveBeenCalledTimes(1);
    expect(result.current.conversations[0].otherId).toBe('org-1');
    expect(result.current.conversations[0].otherName).toBe('محادثة');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(false);

    unmount();
  });

  it('resolves the counterpart on the organization side of the chat key', async () => {
    fetchConversationsMock.mockResolvedValue([conversation('chat_org-1_spec-1')]);

    const { result } = renderHook(() => useConversations('org-1', 'org'));

    await waitFor(() => expect(result.current.conversations).toHaveLength(1));
    expect(result.current.conversations[0].otherId).toBe('spec-1');
  });

  it('does not fetch without a uid', () => {
    renderHook(() => useConversations(null, 'spec'));
    expect(fetchConversationsMock).not.toHaveBeenCalled();
  });

  it('surfaces fetch failures', async () => {
    fetchConversationsMock.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useConversations('spec-1', 'spec'));

    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.conversations).toEqual([]);
  });
});
