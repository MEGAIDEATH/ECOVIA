import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { getDb } from '@/lib/firebase/client';
import { conversationCollectionPath, messageCollectionPath } from '@/lib/firestore/paths';
import { buildParticipants } from '@/lib/utils/chat';
import type { ContractValues } from '@/lib/validation/forms';
import type { ContractData, Message } from '@/types';

type DocumentDataLike = Record<string, unknown>;

function mapMessage(id: string, data: DocumentDataLike): Message {
  return { id, ...(data as Omit<Message, 'id'>) };
}

export interface SendMessageInput {
  chatId: string;
  senderId: string;
  text: string;
  isContract?: boolean;
  contractData?: ContractData;
}

/**
 * Sends a chat message and updates conversation metadata atomically
 * (same Firestore batch). New messages always carry `participants`
 * ([orgUid, specUid]) so listeners stay constrained.
 */
export async function sendMessage(input: SendMessageInput): Promise<void> {
  const participants = buildParticipants(input.chatId);
  if (!participants) {
    throw new Error(`Invalid chat id: ${input.chatId}`);
  }

  const db = getDb();
  const batch = writeBatch(db);

  const messageRef = doc(collection(db, messageCollectionPath));
  batch.set(messageRef, {
    chatId: input.chatId,
    participants,
    senderId: input.senderId,
    text: input.text,
    timestamp: serverTimestamp(),
    ...(input.isContract
      ? { isContract: true, contractData: input.contractData }
      : {}),
  });

  const conversationRef = doc(collection(db, conversationCollectionPath), input.chatId);
  batch.set(
    conversationRef,
    {
      participants,
      lastMessage: input.text,
      lastMessageIsContract: input.isContract ?? false,
      lastMessageAt: serverTimestamp(),
    },
    { merge: true },
  );

  await batch.commit();
}

/**
 * Realtime messages of one conversation. The query mirrors the Firestore read
 * rule (`request.auth.uid in participants`): Firestore only allows a list query
 * when its constraints provably satisfy the rules, so BOTH `chatId` and the
 * caller's participant membership are constrained. Returns an unsubscribe
 * function; callers MUST clean it up.
 */
export function subscribeToMessages(
  chatId: string,
  uid: string,
  onData: (messages: Message[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const q = query(
    collection(getDb(), messageCollectionPath),
    where('chatId', '==', chatId),
    where('participants', 'array-contains', uid),
    orderBy('timestamp', 'asc'),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      onData(snapshot.docs.map((d) => mapMessage(d.id, d.data())));
    },
    (error) => {
      console.error('[messages] snapshot error:', error);
      onError?.(error);
    },
  );
}

/** Organization sends a contract into the chat (status starts `pending`). */
export async function createContract(
  chatId: string,
  senderId: string,
  values: ContractValues,
): Promise<void> {
  await sendMessage({
    chatId,
    senderId,
    text: 'عقد جديد',
    isContract: true,
    contractData: {
      title: values.title,
      value: values.value,
      duration: values.duration,
      orgSig: values.orgSig,
      specSig: null,
      status: 'pending',
    },
  });
}

/**
 * The specialist signs a pending contract. Guarantees (also enforced by
 * Firestore rules): only the specialist participant may sign, and only once.
 */
export async function signContract(
  messageId: string,
  signature: string,
  currentUid: string,
): Promise<void> {
  const db = getDb();
  const ref = doc(db, messageCollectionPath, messageId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) {
    throw new Error('العقد غير موجود.');
  }

  const message = mapMessage(snapshot.id, snapshot.data());
  if (!message.isContract || !message.contractData) {
    throw new Error('هذه الرسالة ليست عقداً.');
  }
  if (message.contractData.status === 'signed') {
    throw new Error('تم توقيع العقد مسبقاً.');
  }

  const participants = message.participants ?? buildParticipants(message.chatId);
  if (!participants || participants[1] !== currentUid) {
    throw new Error('غير مصرح لك بتوقيع هذا العقد.');
  }

  await updateDoc(ref, {
    contractData: {
      ...message.contractData,
      specSig: signature,
      status: 'signed',
    },
  });
}
