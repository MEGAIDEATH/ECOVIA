/**
 * Additive migration for legacy chat data.
 *
 * The legacy app stored ONLY `messages` (no conversation metadata, no
 * `participants` field) and scanned the entire collection in the browser.
 * This script:
 *   1. reads every legacy message,
 *   2. derives chatId + participants ([orgUid, specUid]) from `chat_{org}_{spec}`,
 *   3. creates/updates `chats/{chatId}` metadata (lastMessage/lastMessageAt),
 *   4. backfills the additive `participants` field on messages that lack it,
 *   5. NEVER deletes or rewrites existing content fields.
 *
 * REQUIRED before/with the tightened `firestore.rules`: messages are readable
 * only by their participants, so un-migrated legacy messages (and the chats
 * metadata they feed) stay invisible to clients until this backfill runs.
 *
 * Usage:
 *   FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}' \
 *   npm run migrate:messages
 *
 * Re-runnable: existing `participants`/chats are left intact (only missing
 * values are filled).
 */
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { DATA_APP_ID } from '../src/lib/config/env';

interface LegacyMessage {
  chatId?: string;
  senderId?: string;
  text?: string;
  isContract?: boolean;
  timestamp?: { _seconds?: number; seconds?: number } | null;
  participants?: string[];
}

function parseParticipants(chatId: string): [string, string] | null {
  const parts = chatId.split('_');
  if (parts.length !== 3 || parts[0] !== 'chat') return null;
  return [parts[1], parts[2]];
}

async function main(): Promise<void> {
  const existing = getApps();
  const app =
    existing[0] ??
    (() => {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (raw) {
        return initializeApp({ credential: cert(JSON.parse(raw)) });
      }
      return initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
    })();

  const db = getFirestore(app);
  const messagesRef = db.collection(`artifacts/${DATA_APP_ID}/public/data/messages`);
  const chatsRef = db.collection(`artifacts/${DATA_APP_ID}/public/data/chats`);

  const snapshot = await messagesRef.get();
  console.log(`Found ${snapshot.size} messages.`);

  interface ChatAccumulator {
    participants: [string, string];
    lastMessage: string;
    lastMessageAt: unknown;
    lastMessageIsContract: boolean;
    order: number;
  }
  const chats = new Map<string, ChatAccumulator>();
  let backfilledParticipants = 0;

  // Process in batches of 400 (Firestore limit is 500 per batch).
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data() as LegacyMessage;
    const chatId = data.chatId;
    if (!chatId) {
      console.warn(`Skipping message ${doc.id} without chatId.`);
      continue;
    }

    const participants = data.participants ?? parseParticipants(chatId);
    if (!participants || participants.length !== 2 || !participants[0] || !participants[1]) {
      console.warn(`Skipping message ${doc.id}: cannot derive participants from "${chatId}".`);
      continue;
    }
    const [orgId, specId] = participants;
    const chatParticipants: [string, string] = [orgId, specId];

    // 4) backfill participants on legacy messages (additive only).
    if (!data.participants) {
      batch.update(doc.ref, { participants: chatParticipants });
      backfilledParticipants += 1;
      batchCount += 1;
    }

    // 3) track latest message per chat for metadata upsert.
    const rawTs = data.timestamp as { seconds?: number; _seconds?: number } | null | undefined;
    const seconds = rawTs?.seconds ?? rawTs?._seconds ?? 0;
    const existing = chats.get(chatId);
    if (!existing || seconds > existing.order) {
      chats.set(chatId, {
        participants: chatParticipants,
        lastMessage: data.isContract ? '📄 عقد' : (data.text ?? ''),
        lastMessageAt: seconds
          ? new Date(seconds * 1000)
          : FieldValue.serverTimestamp(),
        lastMessageIsContract: Boolean(data.isContract),
        order: seconds,
      });
    }

    if (batchCount >= 400) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  // 3) create/merge conversation metadata documents.
  for (const [chatId, meta] of chats) {
    const { order: _order, ...fields } = meta;
    await chatsRef.doc(chatId).set(
      {
        ...fields,
        lastMessageAt: fields.lastMessageAt ?? FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  console.log(
    `Done. Backfilled participants on ${backfilledParticipants} messages; upserted ${chats.size} chat metadata documents.`,
  );
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exitCode = 1;
});
