import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';

import { getDb } from '@/lib/firebase/client';
import { applicationCollectionPath, messageCollectionPath, conversationCollectionPath } from '@/lib/firestore/paths';
import { buildParticipants } from '@/lib/utils/chat';
import type { Application } from '@/types';

/** The exact application message the legacy `submitApp()` sent. */
export const APPLICATION_MESSAGE = 'مرحباً، أود التقديم للعمل معكم.';

type DocumentDataLike = Record<string, unknown>;

function mapApplication(id: string, data: DocumentDataLike): Application {
  return { id, ...(data as Omit<Application, 'id'>) };
}

export interface CreateApplicationInput {
  specialistId: string;
  organizationId: string;
  organizationName: string;
  chatId: string;
}

/**
 * Opens the chat with the legacy application message AND records a structured
 * application (additive) so "سجل التقديمات السابقة" can reliably show history.
 * Both writes happen in one atomic batch.
 */
export async function createApplication(input: CreateApplicationInput): Promise<void> {
  const participants = buildParticipants(input.chatId);
  if (!participants) {
    throw new Error(`Invalid chat id: ${input.chatId}`);
  }

  const db = getDb();
  const batch = writeBatch(db);

  batch.set(doc(collection(db, messageCollectionPath)), {
    chatId: input.chatId,
    participants,
    senderId: input.specialistId,
    text: APPLICATION_MESSAGE,
    timestamp: serverTimestamp(),
  });

  batch.set(doc(collection(db, applicationCollectionPath)), {
    specialistId: input.specialistId,
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    status: 'submitted',
    chatId: input.chatId,
    createdAt: serverTimestamp(),
  });

  batch.set(
    doc(collection(db, conversationCollectionPath), input.chatId),
    {
      participants,
      lastMessage: APPLICATION_MESSAGE,
      lastMessageIsContract: false,
      lastMessageAt: serverTimestamp(),
    },
    { merge: true },
  );

  await batch.commit();
}

/** Application history for a specialist (constrained query, newest first). */
export async function getApplicationsForSpecialist(
  specialistId: string,
): Promise<Application[]> {
  const q = query(
    collection(getDb(), applicationCollectionPath),
    where('specialistId', '==', specialistId),
    orderBy('createdAt', 'desc'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => mapApplication(d.id, d.data()));
}
