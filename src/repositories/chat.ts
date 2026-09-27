import 'server-only';

import { and, asc, desc, eq, inArray } from 'drizzle-orm';

import { getDb } from '@/db';
import {
  accountEvents,
  contracts,
  conversations,
  messages,
  organizations,
  specialists,
} from '@/db/schema';
import { buildChatId, parseChatId } from '@/lib/utils/chat';
import type { ContractData, ContractStatus, Conversation, Message } from '@/types';

export class ChatAccessError extends Error {
  constructor(message = 'غير مصرح بالوصول إلى هذه المحادثة.') {
    super(message);
    this.name = 'ChatAccessError';
  }
}

export class ContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContractError';
  }
}

export interface ResolvedConversation {
  id: string;
  organizationId: string;
  specialistId: string;
  organizationUserId: string;
  specialistUserId: string;
  chatId: string;
}

type ConversationRow = typeof conversations.$inferSelect;

function toClientConversation(
  row: ConversationRow,
  organizationUserId: string,
  specialistUserId: string,
): Conversation {
  return {
    chatId: buildChatId(organizationUserId, specialistUserId),
    participants: [organizationUserId, specialistUserId],
    lastMessage: row.lastMessage,
    lastMessageAt: row.lastMessageAt.toISOString(),
    lastMessageIsContract: row.lastMessageIsContract,
  };
}

/**
 * Resolves a legacy-style chat key (`chat_{orgUserId}_{specUserId}`) to its
 * normalized conversation and verifies the caller participates in it.
 */
export async function resolveConversation(
  chatId: string,
  userId: string,
): Promise<ResolvedConversation> {
  const parsed = parseChatId(chatId);
  if (!parsed) throw new ChatAccessError('معرّف المحادثة غير صالح.');

  const db = getDb();
  const [organizationRows, specialistRows] = await Promise.all([
    db.select().from(organizations).where(eq(organizations.userId, parsed.orgId)).limit(1),
    db.select().from(specialists).where(eq(specialists.userId, parsed.specId)).limit(1),
  ]);
  const organization = organizationRows[0];
  const specialist = specialistRows[0];
  if (!organization || !specialist) throw new ChatAccessError();

  if (userId !== organization.userId && userId !== specialist.userId) throw new ChatAccessError();

  const existing = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.organizationId, organization.id),
        eq(conversations.specialistId, specialist.id),
      ),
    )
    .limit(1);

  const row =
    existing[0] ??
    (
      await db
        .insert(conversations)
        .values({ organizationId: organization.id, specialistId: specialist.id })
        .returning()
    )[0];

  return {
    id: row.id,
    organizationId: organization.id,
    specialistId: specialist.id,
    organizationUserId: organization.userId,
    specialistUserId: specialist.userId,
    chatId: buildChatId(organization.userId, specialist.userId),
  };
}

/** Every conversation the caller participates in, newest activity first. */
export async function listConversationsForUser(userId: string): Promise<Conversation[]> {
  const db = getDb();
  const [organizationRows, specialistRows] = await Promise.all([
    db.select({ id: organizations.id }).from(organizations).where(eq(organizations.userId, userId)),
    db.select({ id: specialists.id }).from(specialists).where(eq(specialists.userId, userId)),
  ]);

  const organizationId = organizationRows[0]?.id;
  const specialistId = specialistRows[0]?.id;
  if (!organizationId && !specialistId) return [];

  const conditions = [
    organizationId ? eq(conversations.organizationId, organizationId) : undefined,
    specialistId ? eq(conversations.specialistId, specialistId) : undefined,
  ].filter((value): value is NonNullable<typeof value> => Boolean(value));

  const rows = await db
    .select()
    .from(conversations)
    .where(conditions.length === 1 ? conditions[0] : and(...conditions))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(200);

  if (rows.length === 0) return [];

  // Resolve participant user ids for the chat keys in one round trip each.
  const orgProfileIds = [...new Set(rows.map((row) => row.organizationId))];
  const specProfileIds = [...new Set(rows.map((row) => row.specialistId))];
  const [orgProfiles, specProfiles] = await Promise.all([
    db
      .select({ id: organizations.id, userId: organizations.userId })
      .from(organizations)
      .where(inArray(organizations.id, orgProfileIds)),
    db
      .select({ id: specialists.id, userId: specialists.userId })
      .from(specialists)
      .where(inArray(specialists.id, specProfileIds)),
  ]);
  const orgUserById = new Map(orgProfiles.map((row) => [row.id, row.userId]));
  const specUserById = new Map(specProfiles.map((row) => [row.id, row.userId]));

  return rows.map((row) =>
    toClientConversation(
      row,
      orgUserById.get(row.organizationId) ?? '',
      specUserById.get(row.specialistId) ?? '',
    ),
  );
}

type MessageRow = typeof messages.$inferSelect;
type ContractRow = typeof contracts.$inferSelect;

function toClientMessage(row: MessageRow, contract: ContractRow | null): Message {
  const contractData: ContractData | undefined = contract
    ? {
        title: contract.title,
        value: contract.value,
        duration: contract.duration,
        orgSig: contract.organizationSignature,
        specSig: contract.specialistSignature,
        status: contract.status,
      }
    : undefined;

  return {
    id: row.id,
    conversationId: row.conversationId,
    senderUserId: row.senderUserId,
    text: row.body,
    timestamp: row.createdAt.toISOString(),
    isContract: row.isContract,
    contractData,
  };
}

/** Messages of one conversation (participants only), oldest first. */
export async function listMessages(chatId: string, userId: string): Promise<Message[]> {
  const conversation = await resolveConversation(chatId, userId);
  const db = getDb();

  const rows = await db
    .select({ message: messages, contract: contracts })
    .from(messages)
    .leftJoin(contracts, eq(contracts.messageId, messages.id))
    .where(eq(messages.conversationId, conversation.id))
    .orderBy(asc(messages.createdAt))
    .limit(500);

  return rows.map((row) => toClientMessage(row.message, row.contract));
}

export interface SendMessageInput {
  chatId: string;
  senderUserId: string;
  text: string;
}

/** Sends a plain message and refreshes the conversation summary atomically. */
export async function sendMessage(input: SendMessageInput): Promise<Message> {
  const conversation = await resolveConversation(input.chatId, input.senderUserId);
  const db = getDb();

  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(messages)
      .values({
        conversationId: conversation.id,
        senderUserId: input.senderUserId,
        body: input.text,
      })
      .returning();

    await tx
      .update(conversations)
      .set({
        lastMessage: input.text,
        lastMessageIsContract: false,
        lastMessageAt: new Date(),
      })
      .where(eq(conversations.id, conversation.id));

    return toClientMessage(inserted[0], null);
  });
}

export interface ContractValues {
  title: string;
  value: string;
  duration: string;
  orgSig: string;
}

/**
 * Organization creates a contract inside the conversation. Only the
 * organization participant may create contracts (legacy behavior).
 */
export async function createContractMessage(
  chatId: string,
  senderUserId: string,
  values: ContractValues,
): Promise<Message> {
  const conversation = await resolveConversation(chatId, senderUserId);
  if (senderUserId !== conversation.organizationUserId) {
    throw new ChatAccessError('فقط الجهة يمكنها إنشاء العقود.');
  }

  const db = getDb();
  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(messages)
      .values({
        conversationId: conversation.id,
        senderUserId,
        body: 'عقد جديد',
        isContract: true,
      })
      .returning();

    const contractRows = await tx
      .insert(contracts)
      .values({
        messageId: inserted[0].id,
        conversationId: conversation.id,
        title: values.title,
        value: values.value,
        duration: values.duration,
        organizationSignature: values.orgSig,
        status: 'pending',
      })
      .returning();

    await tx
      .update(conversations)
      .set({ lastMessage: 'عقد جديد', lastMessageIsContract: true, lastMessageAt: new Date() })
      .where(eq(conversations.id, conversation.id));

    return toClientMessage(inserted[0], contractRows[0]);
  });
}

/**
 * Specialist signs a pending contract. Guarantees (enforced in SQL + server
 * code):
 *   - only the specialist participant of that conversation may sign,
 *   - a contract can be signed exactly once.
 */
export async function signContract(
  messageId: string,
  signature: string,
  currentUserId: string,
): Promise<void> {
  const db = getDb();

  await db.transaction(async (tx) => {
    const rows = await tx
      .select({ contract: contracts, message: messages, conversation: conversations })
      .from(contracts)
      .innerJoin(messages, eq(messages.id, contracts.messageId))
      .innerJoin(conversations, eq(conversations.id, contracts.conversationId))
      .where(eq(contracts.messageId, messageId))
      .limit(1);

    const row = rows[0];
    if (!row) throw new ContractError('العقد غير موجود.');

    const specialistRows = await tx
      .select({ userId: specialists.userId })
      .from(specialists)
      .where(eq(specialists.id, row.conversation.specialistId))
      .limit(1);

    if (specialistRows[0]?.userId !== currentUserId) {
      throw new ContractError('غير مصرح لك بتوقيع هذا العقد.');
    }
    if (row.contract.status === ('signed' satisfies ContractStatus)) {
      throw new ContractError('تم توقيع العقد مسبقاً.');
    }

    await tx
      .update(contracts)
      .set({ specialistSignature: signature, status: 'signed', signedAt: new Date() })
      .where(eq(contracts.id, row.contract.id));

    await tx.insert(accountEvents).values({
      actorUserId: currentUserId,
      action: 'contract.signed',
      detail: row.contract.title,
      targetId: row.contract.id,
    });
  });
}
