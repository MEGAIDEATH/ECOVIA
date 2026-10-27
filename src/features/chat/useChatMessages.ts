 

import { useEffect, useState } from 'react';
import type { Message } from '@/types';

interface UseChatMessagesResult {
  messages: Message[];
  loading: boolean;
  error: boolean;
}

const EMPTY_MESSAGES: Message[] = [];

/**
 * Polls for messages of the active chat.
 */
export const useChatMessages = (chatId: string | null): UseChatMessagesResult => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(Boolean(chatId));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!chatId) return;

    let active = true;

    async function load() {
      try {
        const res = await fetch(`/api/chat/messages?chatId=${encodeURIComponent(chatId!)}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (active) {
          setMessages(data);
          setError(false);
        }
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    const interval = setInterval(load, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [chatId]);

  // No active chat: derive an empty result instead of resetting state in the
  // effect (avoids synchronous setState during render commit).
  if (!chatId) {
    return { messages: EMPTY_MESSAGES, loading: false, error: false };
  }
  return { messages, loading, error };
};
