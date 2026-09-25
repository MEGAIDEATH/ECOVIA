'use client';

import { useEffect, useState } from 'react';

import type { Message } from '@/types';

import { subscribeToMessages } from './messageRepository';

interface ChatMessagesState {
  chatId: string | null;
  messages: Message[];
  loading: boolean;
  error: boolean;
}

interface UseChatMessagesResult {
  messages: Message[];
  loading: boolean;
  error: boolean;
}

const idle = (chatId: string | null): ChatMessagesState => ({
  chatId,
  messages: [],
  loading: chatId !== null,
  error: false,
});

/**
 * Realtime messages for one chat. State is keyed by chatId so switching
 * conversations resets derived values WITHOUT synchronous setState inside
 * the effect. The listener is ALWAYS unsubscribed on unmount/chat change —
 * this replaces the legacy full-collection `onSnapshot` scanning.
 *
 * `uid` is required because the Firestore read rule only allows participants
 * to list a chat's messages, and list queries must carry the same constraint.
 */
export function useChatMessages(
  chatId: string | null,
  uid: string | null,
): UseChatMessagesResult {
  const [state, setState] = useState<ChatMessagesState>(() => idle(chatId));

  useEffect(() => {
    if (!chatId || !uid) return;

    let active = true;
    const unsubscribe = subscribeToMessages(
      chatId,
      uid,
      (list) => {
        if (!active) return;
        setState({ chatId, messages: list, loading: false, error: false });
      },
      () => {
        if (!active) return;
        setState({ chatId, messages: [], loading: false, error: true });
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [chatId, uid]);

  if (state.chatId === chatId) {
    return { messages: state.messages, loading: state.loading, error: state.error };
  }
  // chatId just changed: derive the pre-load state (no effect writes needed).
  return { messages: [], loading: chatId !== null, error: false };
}