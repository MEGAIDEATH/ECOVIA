/**
 * Contracts between a facility (organization) and a specialist.
 *
 * Since 0006 a contract is prepared by the facility from a selected offer on
 * a service request, announced in the pair's conversation by a chat message,
 * and signed by the specialist. Integrity rules enforced by PostgreSQL:
 *
 * - `contracts_one_signed_per_request`: at most ONE signed contract per
 *   request, whatever the application code does or how requests race.
 * - `contracts_one_pending_per_request`: at most one contract awaiting
 *   signature per request at a time.
 * - Every foreign key is `ON DELETE RESTRICT`: deleting a user, profile,
 *   conversation, message, request or offer can never silently cascade into
 *   a signed contract (the audit record must be removed deliberately).
 *
 * Contracts created before 0006 (from the chat "create contract" dialog) have
 * no request/offer link; their parties were backfilled from the conversation.
 *
 * Signatures are typed names confirmed inside the platform — not a certified
 * electronic signature.
 */
import { sql } from 'drizzle-orm';
import { check, index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { conversations, messages } from './chat';
import { organizations, specialists } from './domain';
import { serviceRequestOffers, serviceRequests } from './engagement';

/** pending = awaiting the specialist's signature; cancelled = withdrawn/voided before signing. */
export const contractStatus = pgEnum('contract_status', ['pending', 'signed', 'cancelled']);

export const contracts = pgTable(
  'contracts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** The chat message that carries the contract card. */
    messageId: uuid('message_id')
      .notNull()
      .unique()
      .references(() => messages.id, { onDelete: 'restrict' }),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'restrict' }),
    /** Null only on legacy (pre-0006) chat contracts. */
    serviceRequestId: uuid('service_request_id').references(() => serviceRequests.id, { onDelete: 'restrict' }),
    offerId: uuid('offer_id').references(() => serviceRequestOffers.id, { onDelete: 'restrict' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    specialistId: uuid('specialist_id')
      .notNull()
      .references(() => specialists.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    /** Contract value in SAR as entered by the facility (legacy free text). */
    value: text('value').notNull(),
    duration: text('duration').notNull(),
    organizationSignature: text('organization_signature').notNull(),
    specialistSignature: text('specialist_signature'),
    status: contractStatus('status').notNull().default('pending'),
    organizationSignedAt: timestamp('organization_signed_at', { withTimezone: true }),
    signedAt: timestamp('signed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('contracts_status_idx').on(table.status),
    index('contracts_conversation_idx').on(table.conversationId),
    index('contracts_organization_idx').on(table.organizationId),
    index('contracts_specialist_idx').on(table.specialistId),
    // withdrawOffer / cancellation look contracts up by offer.
    index('contracts_offer_idx').on(table.offerId),
    uniqueIndex('contracts_one_signed_per_request')
      .on(table.serviceRequestId)
      .where(sql`${table.status} = 'signed'`),
    uniqueIndex('contracts_one_pending_per_request')
      .on(table.serviceRequestId)
      .where(sql`${table.status} = 'pending'`),
    check(
      'contracts_signed_requires_signature',
      sql`${table.status} <> 'signed' OR (${table.specialistSignature} IS NOT NULL AND ${table.signedAt} IS NOT NULL)`,
    ),
  ],
);
