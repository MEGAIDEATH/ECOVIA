import 'server-only';

import { and, desc, eq, inArray } from 'drizzle-orm';

import { getDb } from '@/db';
import { contracts, conversations, messages, organizations, specialists } from '@/db/schema';
import { buildChatId, parseChatId } from '@/lib/utils/chat';
import type { ContractData, Conversation, Message } from '@/types';

import { haveRelationship } from './documents';

export class ChatAccessError extends Error {
  constructor(message = 'غير مصرح بالوصول إلى هذه المحادثة.') {
    super(message);
    this.name = 'ChatAccessError';
  }
}

/** Kept for API compatibility of error mapping (contract errors now raise DomainError). */
export class ContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContractError';
  }
}

export const MESSAGE_MAX_LENGTH = 2000;

/** Who is acting in a conversation: always derived from the session on the server. */
export interface ChatActor {
  userId: string;
  approvedOrganizationId: string | null;
  approvedSpecialistId: string | null;
}

export interface ResolvedConversation {
  id: string | null;
  organizationId: string;
  specialistId: string;
  organizationUserId: string;
  specialistUserId: string;
  chatId: string;
  actingAs: 'org' | 'spec';
}

/**
 * Resolves a chat key (`chat_{orgUserId}_{specUserId}`) for the caller:
 * - the caller must be one of the two parties and APPROVED in that role;
 * - a facility talking to itself (one user owning both profiles) is refused;
 * - with `create`, a missing conversation is opened only when the facility
 *   starts it with an approved specialist, or the specialist already has a
 *   business relationship with the facility (offer, private request,
 *   contract) — specialists cannot cold-message facilities.
 * Reads never create rows.
 */
export async function resolveConversation(
  chatId: string,
  actor: ChatActor,
  options: { create?: boolean } = {},
): Promise<ResolvedConversation> {
  const parsed = parseChatId(chatId);
  if (!parsed) throw new ChatAccessError('معرّف المحادثة غير صالح.');
  if (parsed.orgId === parsed.specId) throw new ChatAccessError();

  const db = getDb();
  const [organizationRows, specialistRows] = await Promise.all([
    db.select().from(organizations).where(eq(organizations.userId, parsed.orgId)).limit(1),
    db.select().from(specialists).where(eq(specialists.userId, parsed.specId)).limit(1),
  ]);
  const organization = organizationRows[0];
  const specialist = specialistRows[0];
  if (!organization || !specialist) throw new ChatAccessError();

  let actingAs: 'org' | 'spec';
  if (actor.userId === organization.userId && actor.approvedOrganizationId === organization.id) actingAs = 'org';
  else if (actor.userId === specialist.userId && actor.approvedSpecialistId === specialist.id) actingAs = 'spec';
  else throw new ChatAccessError();

  const existing = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.organizationId, organization.id), eq(conversations.specialistId, specialist.id)))
    .limit(1);

  let id = existing[0]?.id ?? null;
  if (!id && options.create) {
    const counterpartApproved = actingAs === 'org' ? specialist.status === 'approved' : organization.status === 'approved';
    if (!counterpartApproved) throw new ChatAccessError('الطرف الآخر غير متاح للمراسلة.');
    if (actingAs === 'spec' && !(await haveRelationship(organization.id, specialist.id))) {
      throw new ChatAccessError('يمكنك مراسلة المنشأة بعد تقديم عرض على أحد طلباتها.');
    }
    await db
      .insert(conversations)
      .values({ organizationId: organization.id, specialistId: specialist.id })
      .onConflictDoNothing({ target: [conversations.organizationId, conversations.specialistId] });
    const [row] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.organizationId, organization.id), eq(conversations.specialistId, specialist.id)))
      .limit(1);
    id = row?.id ?? null;
  }

  return {
    id,
    organizationId: organization.id,
    specialistId: specialist.id,
    organizationUserId: organization.userId,
    specialistUserId: specialist.userId,
    chatId: buildChatId(organization.userId, specialist.userId),
    actingAs,
  };
}

/** Every conversation the caller participates in with an approved profile, newest activity first. */
export async function listConversationsForUser(actor: ChatActor): Promise<Conversation[]> {
  const conditions = [
    actor.approvedOrganizationId ? eq(conversations.organizationId, actor.approvedOrganizationId) : undefined,
    actor.approvedSpecialistId ? eq(conversations.specialistId, actor.approvedSpecialistId) : undefined,
  ].filter((value): value is NonNullable<typeof value> => Boolean(value));
  if (conditions.length === 0) return [];

  const db = getDb();
  const rows = await db
    .select({
      conversation: conversations,
      orgUserId: organizations.userId,
      orgName: organizations.orgName,
      specUserId: specialists.userId,
      specName: specialists.fullName,
    })
    .from(conversations)
    .innerJoin(organizations, eq(conversations.organizationId, organizations.id))
    .innerJoin(specialists, eq(conversations.specialistId, specialists.id))
    .where(conditions.length === 1 ? conditions[0] : and(...conditions))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(200);

  return rows.map((row) => ({
    chatId: buildChatId(row.orgUserId, row.specUserId),
    participants: [row.orgUserId, row.specUserId],
    organizationId: row.conversation.organizationId,
    specialistId: row.conversation.specialistId,
    organizationName: row.orgName || undefined,
    specialistName: row.specName || undefined,
    lastMessage: row.conversation.lastMessage,
    lastMessageAt: row.conversation.lastMessageAt.toISOString(),
    lastMessageIsContract: row.conversation.lastMessageIsContract,
  }));
}

type MessageRow = typeof messages.$inferSelect;
type ContractRow = typeof contracts.$inferSelect;

function toClientMessage(row: MessageRow, contract: ContractRow | null): Message {
  const contractData: ContractData | undefined = contract
    ? {
        contractId: contract.id,
        serviceRequestId: contract.serviceRequestId,
        title: contract.title,
        value: contract.value,
        duration: contract.duration,
        orgSig: contract.organizationSignature,
        specSig: contract.status === 'signed' ? contract.specialistSignature : null,
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

export const MESSAGE_PAGE_SIZE = 200;

/** The latest messages of one conversation (participants only), oldest first. */
export async function listMessages(chatId: string, actor: ChatActor): Promise<Message[]> {
  const conversation = await resolveConversation(chatId, actor);
  if (!conversation.id) return [];
  const rows = await getDb()
    .select({ message: messages, contract: contracts })
    .from(messages)
    .leftJoin(contracts, eq(contracts.messageId, messages.id))
    .where(eq(messages.conversationId, conversation.id))
    .orderBy(desc(messages.createdAt))
    .limit(MESSAGE_PAGE_SIZE);
  return rows.reverse().map((row) => toClientMessage(row.message, row.contract));
}

/** Sends a plain message (sender = session user) and refreshes the conversation summary atomically. */
export async function sendMessage(chatId: string, actor: ChatActor, text: string): Promise<Message> {
  const conversation = await resolveConversation(chatId, actor, { create: true });
  if (!conversation.id) throw new ChatAccessError();
  const conversationId = conversation.id;
  return getDb().transaction(async (tx) => {
    const [inserted] = await tx
      .insert(messages)
      .values({ conversationId, senderUserId: actor.userId, body: text })
      .returning();
    await tx
      .update(conversations)
      .set({ lastMessage: text.slice(0, 300), lastMessageIsContract: false, lastMessageAt: inserted.createdAt })
      .where(eq(conversations.id, conversationId));
    return toClientMessage(inserted, null);
  });
}

/** Chat keys of the pairs, for links from request / offer screens. */
export async function chatIdsForPairs(
  pairs: Array<{ organizationId: string; specialistId: string }>,
): Promise<Map<string, string>> {
  if (pairs.length === 0) return new Map();
  const db = getDb();
  const [orgRows, specRows] = await Promise.all([
    db
      .select({ id: organizations.id, userId: organizations.userId })
      .from(organizations)
      .where(inArray(organizations.id, [...new Set(pairs.map((pair) => pair.organizationId))])),
    db
      .select({ id: specialists.id, userId: specialists.userId })
      .from(specialists)
      .where(inArray(specialists.id, [...new Set(pairs.map((pair) => pair.specialistId))])),
  ]);
  const orgUser = new Map(orgRows.map((row) => [row.id, row.userId]));
  const specUser = new Map(specRows.map((row) => [row.id, row.userId]));
  const result = new Map<string, string>();
  for (const pair of pairs) {
    const org = orgUser.get(pair.organizationId);
    const spec = specUser.get(pair.specialistId);
    if (org && spec && org !== spec) result.set(`${pair.organizationId}:${pair.specialistId}`, buildChatId(org, spec));
  }
  return result;
}

