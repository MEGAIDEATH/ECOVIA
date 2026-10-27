 

import { useEffect, useState } from 'react';
import { fetchConversations } from './conversationRepository';
import type { Conversation, UserRole } from '@/types';

export interface ConversationView extends Conversation {
  otherId: string | null;
  otherName: string;
}

interface UseConversationsResult {
  conversations: ConversationView[];
  loading: boolean;
  error: boolean;
}

const EMPTY_CONVERSATIONS: ConversationView[] = [];

export const useConversations = (
  currentUid: string | null,
  role: UserRole,
): UseConversationsResult => {
  const [conversations, setConversations] = useState<ConversationView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!currentUid) return;

    let active = true;

    async function load() {
      try {
        const raw = await fetchConversations();
        if (!active) return;
        const mapped = raw.map((c) => {
          const otherId = role === 'spec' ? c.participants[0] : c.participants[1];
          return {
            ...c,
            otherId,
            otherName: 'محادثة',
          };
        });
        setConversations(mapped);
        setError(false);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    const interval = setInterval(load, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [currentUid, role]);

  // Signed-out: derive an empty result instead of resetting state inside the
  // effect (avoids synchronous setState during render commit).
  if (!currentUid) {
    return { conversations: EMPTY_CONVERSATIONS, loading: false, error: false };
  }
  return { conversations, loading, error };
};
