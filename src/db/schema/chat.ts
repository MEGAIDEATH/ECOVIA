/**
 * Chat tables: one conversation per organization ↔ specialist pair, and its
 * messages. Contracts live in `./contracts.ts` (they reference requests and
 * offers as well as the chat message that announces them).
 */
import { boolean, index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { user } from './auth';
import { organizations, specialists } from './domain';

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
    // organization_id lookups use the leading column of conversations_pair_key.
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
