/**
 * Engagement + operational tables: applications, the audit trail and the
 * development OTP codes used by the code-based sign-in flow.
 */
import { boolean, index, pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

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

/** Service request lifecycle. */
export const serviceRequestStatus = pgEnum('service_request_status', [
  'pending',
  'accepted',
  'rejected',
  'in_progress',
  'completed',
]);

export const serviceRequests = pgTable(
  'service_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    specialistId: uuid('specialist_id').references(() => specialists.id, { onDelete: 'set null' }),
    serviceCategory: text('service_category').notNull(),
    serviceName: text('service_name').notNull(),
    region: text('region').notNull(),
    city: text('city').notNull(),
    duration: text('duration').notNull(),
    description: text('description'),
    status: serviceRequestStatus('status').notNull().default('pending'),
    rejectionReason: text('rejection_reason'),
    conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('service_requests_org_idx').on(table.organizationId, table.createdAt.desc()),
    index('service_requests_spec_idx').on(table.specialistId, table.status),
    index('service_requests_status_idx').on(table.status),
  ],
);

/** In-app notifications. */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    recipientUserId: text('recipient_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    title: text('title').notNull(),
    message: text('message'),
    relatedId: uuid('related_id'),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp('read_at', { withTimezone: true }),
  },
  (table) => [index('notifications_recipient_idx').on(table.recipientUserId, table.createdAt.desc())],
);

