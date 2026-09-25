'use client';

import { useEffect, useState } from 'react';

import { getPublicOrganization, getPublicSpecialist } from '@/features/directory/directoryService';
import { getOtherParticipantId } from '@/lib/utils/chat';
import type { Conversation, UserRole } from '@/types';

import { subscribeToConversations } from './conversationRepository';

/** Display-name cache (replaces the legacy `window.userNamesCache`). */
const nameCache = new Map<string, string>();

async function resolveDisplayName(
  chatId: string,
  role: UserRole,
): Promise<{ otherId: string | null; name: string }> {
  const otherId = getOtherParticipantId(chatId, role);
  if (!otherId) return { otherId: null, name: 'مستخدم' };

  const cacheKey = `${role}:${otherId}`;
  const cached = nameCache.get(cacheKey);
  if (cached) return { otherId, name: cached };

  try {
    let name: string | null = null;
    if (role === 'spec') {
      name = (await getPublicOrganization(otherId)).orgName;
    } else {
      name = (await getPublicSpecialist(otherId)).fullName;
    }
    if (name) {
      nameCache.set(cacheKey, name);
      return { otherId, name };
    }
  } catch (error) {
    console.error('[conversations] display name lookup failed:', error);
  }
  return { otherId, name: 'مستخدم' };
}

export interface ConversationView extends Conversation {
  otherId: string | null;
  otherName: string;
}

interface UseConversationsResult {
  conversations: ConversationView[];
  loading: boolean;
  error: boolean;
}

/**
 * Realtime conversation list for the current user, with the counterpart's
 * display name resolved (and cached). Cleans up the listener on unmount.
 */
export function useConversations(uid: string | null, role: UserRole): UseConversationsResult {
  const [conversations, setConversations] = useState<ConversationView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!uid) return;

    let active = true;

    const unsubscribe = subscribeToConversations(
      uid,
      (list) => {
        if (!active) return;
        setLoading(false);
        if (list.length === 0) {
          setConversations([]);
          return;
        }

        void Promise.all(
          list.map(async (conversation) => {
            const { otherId, name } = await resolveDisplayName(conversation.chatId, role);
            return { ...conversation, otherId, otherName: name };
          }),
        ).then((resolved) => {
          if (active) setConversations(resolved);
        });
      },
      () => {
        if (active) {
          setLoading(false);
          setError(true);
        }
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [uid, role]);

  return { conversations, loading, error };
}