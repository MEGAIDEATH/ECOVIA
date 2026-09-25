import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Message } from '@/types';

import { useChatMessages } from './useChatMessages';

const subscribeMock = vi.hoisted(() => vi.fn());
vi.mock('./messageRepository', () => ({
  subscribeToMessages: subscribeMock,
}));

function makeMessage(id: string): Message {
  return { id, chatId: 'chat_a_b', senderId: 'u1', text: `msg-${id}` };
}

describe('useChatMessages', () => {
  afterEach(() => {
    subscribeMock.mockReset();
  });

  it('subscribes with the chatId AND the participant uid, unsubscribes on unmount', () => {
    const unsub = vi.fn();
    let captured: ((messages: Message[]) => void) | null = null;
    subscribeMock.mockImplementation(
      (_chatId: string, _uid: string, onData: (messages: Message[]) => void) => {
        captured = onData;
        return unsub;
      },
    );

    const { result, unmount } = renderHook(() => useChatMessages('chat_a_b', 'spec-1'));
    // Both constraints are required: the read rule only lets a chat's
    // participants list its messages.
    expect(subscribeMock).toHaveBeenCalledWith(
      'chat_a_b',
      'spec-1',
      expect.any(Function),
      expect.any(Function),
    );
    expect(result.current.loading).toBe(true);

    act(() => {
      captured?.([makeMessage('1'), makeMessage('2')]);
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.loading).toBe(false);
    expect(result.current.messages[0].text).toBe('msg-1');

    unmount();
    expect(unsub).toHaveBeenCalledTimes(1);
  });

  it('cleans up the listener when the active chat changes', () => {
    const unsub = vi.fn();
    subscribeMock.mockReturnValue(unsub);

    const { rerender } = renderHook(
      ({ chatId }: { chatId: string | null }) => useChatMessages(chatId, 'spec-1'),
      { initialProps: { chatId: 'chat_a_b' as string | null } },
    );

    rerender({ chatId: 'chat_c_d' });
    expect(unsub).toHaveBeenCalledTimes(1);
    expect(subscribeMock).toHaveBeenCalledTimes(2);

    rerender({ chatId: null });
    expect(unsub).toHaveBeenCalledTimes(2);
  });

  it('resets state and stops loading when chatId is null', async () => {
    subscribeMock.mockReturnValue(vi.fn());
    const { result } = renderHook(() => useChatMessages(null, 'spec-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.messages).toEqual([]);
    expect(subscribeMock).not.toHaveBeenCalled();
  });

  it('does not subscribe before the uid is resolved', () => {
    subscribeMock.mockReturnValue(vi.fn());
    renderHook(() => useChatMessages('chat_a_b', null));
    expect(subscribeMock).not.toHaveBeenCalled();
  });

  it('surfaces listener errors', () => {
    const unsub = vi.fn();
    let captureError: ((error: Error) => void) | null = null;
    subscribeMock.mockImplementation(
      (_chatId: string, _uid: string, _onData: unknown, onError: (error: Error) => void) => {
        captureError = onError;
        return unsub;
      },
    );

    const { result } = renderHook(() => useChatMessages('chat_a_b', 'spec-1'));
    act(() => captureError?.(new Error('permission denied')));
    expect(result.current.error).toBe(true);
    expect(result.current.messages).toEqual([]);
  });
});
