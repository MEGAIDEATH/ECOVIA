import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import { getDb } from '@/lib/firebase/client';
import { conversationCollectionPath } from '@/lib/firestore/paths';
import { buildParticipants } from '@/lib/utils/chat';
import type { Conversation } from '@/types';

type DocumentDataLike = Record<string, unknown>;

function mapConversation(chatId: string, data: DocumentDataLike): Conversation {
  return { chatId, ...(data as Omit<Conversation, 'chatId'>) };
}

/**
 * Realtime conversation list for a user — constrained by the caller's uid
 * instead of downloading the whole messages collection (the legacy approach).
 * Returns an unsubscribe function; callers MUST clean it up on unmount.
 */
export function subscribeToConversations(
  uid: string,
  onData: (conversations: Conversation[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const q = query(
    collection(getDb(), conversationCollectionPath),
    where('participants', 'array-contains', uid),
    orderBy('lastMessageAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      onData(snapshot.docs.map((d) => mapConversation(d.id, d.data())));
    },
    (error) => {
      console.error('[conversations] snapshot error:', error);
      onError?.(error);
    },
  );
}

export interface ConversationUpdate {
  lastMessage: string;
  lastMessageIsContract: boolean;
}

/**
 * Creates/updates the conversation metadata document for a chat.
 * Called as part of every message send (same Firestore batch).
 */
export function buildConversationData(
  chatId: string,
  update: ConversationUpdate,
): { path: string; data: Record<string, unknown> } {
  const participants = buildParticipants(chatId);
  if (!participants) {
    throw new Error(`Invalid chat id: ${chatId}`);
  }
  return {
    path: `${conversationCollectionPath}/${chatId}`,
    data: {
      participants,
      lastMessage: update.lastMessage,
      lastMessageIsContract: update.lastMessageIsContract,
      lastMessageAt: serverTimestamp(),
    },
  };
}

/** Merge-writes conversation metadata (deterministic doc id = chatId). */
export async function upsertConversation(
  chatId: string,
  update: ConversationUpdate,
): Promise<void> {
  const { path, data } = buildConversationData(chatId, update);
  await setDoc(doc(getDb(), path), data, { merge: true });
}
