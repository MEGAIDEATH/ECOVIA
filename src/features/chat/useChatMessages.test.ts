import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Message } from '@/types';

import { useChatMessages } from './useChatMessages';

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: () => Promise.resolve(body),
  } as Response;
}

function makeMessage(id: string): Message {
  return { id, conversationId: 'chat_a_b', senderUserId: 'u1', text: `msg-${id}` };
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => jsonResponse([makeMessage('1'), makeMessage('2')])),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useChatMessages', () => {
  it('fetches messages for the active chat and stops loading', async () => {
    const { result, unmount } = renderHook(() => useChatMessages('chat_a_b'));
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetch).toHaveBeenCalledWith('/api/chat/messages?chatId=chat_a_b');
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].text).toBe('msg-1');
    expect(result.current.error).toBe(false);

    unmount();
  });

  it('resets state and does not fetch when chatId is null', async () => {
    const { result } = renderHook(() => useChatMessages(null));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.messages).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('surfaces fetch failures', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, false));

    const { result } = renderHook(() => useChatMessages('chat_a_b'));

    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.messages).toEqual([]);
  });
});
