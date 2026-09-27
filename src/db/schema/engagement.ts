/**
 * Engagement + operational tables: applications, the audit trail and the
 * development OTP codes used by the code-based sign-in flow.
 */
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { user } from './auth';
import { conversations } from './chat';
import { organizations, profileKind, specialists } from './domain';

/** Application lifecycle (legacy `applications.status`). */
export const applicationStatus = pgEnum('application_status', ['submitted']);

export const applications = pgTable(
  'applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    specialistId: uuid('specialist_id')
      .notNull()
      .references(() => specialists.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    /** Denormalized display name (legacy kept it on the document). */
    organizationName: text('organization_name').notNull().default(''),
    status: applicationStatus('status').notNull().default('submitted'),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('applications_pair_key').on(table.specialistId, table.organizationId),
    index('applications_specialist_idx').on(table.specialistId, table.createdAt.desc()),
    index('applications_organization_idx').on(table.organizationId),
  ],
);

/**
 * Audit trail: records who changed what and when — approvals, registrations
 * and signature events are written here by the server.
 */
export const accountEvents = pgTable(
  'account_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Null for system actions (e.g. seeding). */
    actorUserId: text('actor_user_id').references(() => user.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    targetKind: profileKind('target_kind'),
    targetId: uuid('target_id'),
    detail: text('detail'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('account_events_created_idx').on(table.createdAt.desc())],
);

// One-time sign-in codes are owned by Better Auth's email-OTP plugin and stored
// (hashed) in the `verification` table — deliberately not duplicated here.
