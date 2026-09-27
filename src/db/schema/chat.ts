/**
 * Chat tables: conversations, messages and contracts.
 *
 * The legacy model embedded `contractData` inside the message document; here
 * contracts are a first-class table keyed by their message, with the signature
 * lifecycle (`pending` → `signed`) enforced by the server.
 */
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { user } from './auth';
import { organizations, specialists } from './domain';

/** Contract lifecycle (legacy `contractData.status`). */
export const contractStatus = pgEnum('contract_status', ['pending', 'signed']);

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    specialistId: uuid('specialist_id')
      .notNull()
      .references(() => specialists.id, { onDelete: 'cascade' }),
    lastMessage: text('last_message').notNull().default(''),
    lastMessageIsContract: boolean('last_message_is_contract').notNull().default(false),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('conversations_pair_key').on(table.organizationId, table.specialistId),
    index('conversations_last_message_idx').on(table.lastMessageAt.desc()),
    index('conversations_specialist_idx').on(table.specialistId),
    index('conversations_organization_idx').on(table.organizationId),
  ],
);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    senderUserId: text('sender_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    isContract: boolean('is_contract').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('messages_conversation_created_idx').on(table.conversationId, table.createdAt),
    index('messages_sender_idx').on(table.senderUserId),
  ],
);

export const contracts = pgTable(
  'contracts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    messageId: uuid('message_id')
      .notNull()
      .unique()
      .references(() => messages.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    value: text('value').notNull(),
    duration: text('duration').notNull(),
    organizationSignature: text('organization_signature').notNull(),
    specialistSignature: text('specialist_signature'),
    status: contractStatus('status').notNull().default('pending'),
    signedAt: timestamp('signed_at', { withTimezone: true }),
  },
  (table) => [index('contracts_status_idx').on(table.status)],
);
