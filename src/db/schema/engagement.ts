/**
 * Engagement + operational tables: applications, the audit trail and the
 * development OTP codes used by the code-based sign-in flow.
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { SERVICE_TYPE_KEYS } from '../../lib/serviceTypes';
import { user } from './auth';
import { conversations } from './chat';
import { organizations, profileKind, regions, specialists } from './domain';

/**
 * Application lifecycle (legacy `applications.status`).
 * DEPRECATED: the "apply to an organization" flow was removed from the UI and
 * superseded by offers on service requests (`service_request_offers`). The
 * table is kept (no rows in any environment at the time of 0006) and is a
 * candidate for removal in a later migration.
 */
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

/**
 * Service request lifecycle (see docs/ECHOVIA_IMPLEMENTATION_REPORT.md §7):
 *
 *   pending      open for offers — any number of specialists may submit offers,
 *                and the facility may select one and prepare a contract; the
 *                request stays open until a contract is SIGNED.
 *   accepted     a contract was signed (exactly one per request, enforced by
 *                `contracts_one_signed_per_request`); closed to new offers.
 *   in_progress  the contracted specialist started the work.
 *   completed    the contracted specialist finished the work.
 *   cancelled    withdrawn by the facility while still open.
 *   rejected     legacy only (earlier builds let one specialist close a request).
 */
export const serviceRequestStatus = pgEnum('service_request_status', [
  'pending',
  'accepted',
  'rejected',
  'in_progress',
  'completed',
  'cancelled',
]);

export const durationUnit = pgEnum('duration_unit', ['day', 'week', 'month']);

/** The facility-selectable service catalogue (`src/lib/serviceTypes.ts`). */
export const serviceType = pgEnum('service_type', SERVICE_TYPE_KEYS);

/** public: every eligible specialist; private: one designated specialist. */
export const requestVisibility = pgEnum('request_visibility', ['public', 'private']);

export const serviceRequests = pgTable(
  'service_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    /** The contracted specialist (set when a contract is signed). */
    specialistId: uuid('specialist_id').references(() => specialists.id, { onDelete: 'set null' }),
    /** One or more services from the catalogue (empty only on legacy rows). */
    serviceTypes: serviceType('service_types').array().notNull().default(sql`'{}'::service_type[]`),
    activityDescription: text('activity_description'),
    notes: text('notes'),
    visibility: requestVisibility('visibility').notNull().default('public'),
    /** Private requests only: the single specialist allowed to see/answer it. */
    targetSpecialistId: uuid('target_specialist_id').references(() => specialists.id, { onDelete: 'restrict' }),
    /** Canonical region name — FK to `regions.name_ar`. */
    region: text('region')
      .notNull()
      .references(() => regions.nameAr, { onUpdate: 'cascade', onDelete: 'restrict' }),
    city: text('city'),
    /** Legacy free-text service name (requests created before 0006). */
    serviceName: text('service_name'),
    /** Legacy (pre-0006 request form): category, cost and duration. New requests leave them null — the duration now belongs to each specialist's offer. */
    serviceCategory: text('service_category'),
    cost: numeric('cost', { precision: 12, scale: 2, mode: 'number' }),
    durationValue: integer('duration_value'),
    durationUnit: durationUnit('duration_unit'),
    duration: text('duration'),
    /** Legacy description field (new requests use activity_description + notes). */
    description: text('description'),
    status: serviceRequestStatus('status').notNull().default('pending'),
    rejectionReason: text('rejection_reason'),
    /** Conversation of the contracted pair (set when the contract is signed). */
    conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('service_requests_org_idx').on(table.organizationId, table.createdAt.desc()),
    index('service_requests_spec_idx').on(table.specialistId, table.status),
    index('service_requests_status_created_idx').on(table.status, table.createdAt.desc()),
    // Specialist discovery: open public requests of one region, newest first.
    index('service_requests_open_public_idx')
      .on(table.region, table.createdAt.desc())
      .where(sql`${table.status} = 'pending' AND ${table.visibility} = 'public'`),
    index('service_requests_target_idx')
      .on(table.targetSpecialistId, table.status)
      .where(sql`${table.targetSpecialistId} IS NOT NULL`),
    check('service_requests_cost_nonnegative', sql`${table.cost} IS NULL OR ${table.cost} >= 0`),
    check(
      'service_requests_duration_pair',
      sql`(${table.durationValue} IS NULL) = (${table.durationUnit} IS NULL) AND (${table.durationValue} IS NULL OR ${table.durationValue} > 0)`,
    ),
    check(
      'service_requests_visibility_target',
      sql`(${table.visibility} = 'private') = (${table.targetSpecialistId} IS NOT NULL)`,
    ),
    check(
      'service_requests_content_required',
      sql`${table.serviceName} IS NOT NULL OR (cardinality(${table.serviceTypes}) > 0 AND ${table.activityDescription} IS NOT NULL)`,
    ),
  ],
);

/**
 * Offer lifecycle (one row per specialist per request; the specialist may
 * revise it while it is `submitted`):
 *   submitted → selected   facility picked it and prepared a contract
 *   selected  → submitted  facility withdrew that contract
 *   selected  → accepted   specialist signed the contract
 *   submitted/selected → declined   facility declined it, or the request was
 *                                   contracted to someone else / cancelled
 *   submitted/selected → withdrawn  specialist withdrew it
 */
export const offerStatus = pgEnum('offer_status', ['submitted', 'selected', 'accepted', 'declined', 'withdrawn']);

export const serviceRequestOffers = pgTable(
  'service_request_offers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    serviceRequestId: uuid('service_request_id')
      .notNull()
      .references(() => serviceRequests.id, { onDelete: 'cascade' }),
    specialistId: uuid('specialist_id')
      .notNull()
      .references(() => specialists.id, { onDelete: 'cascade' }),
    /** Time the specialist needs to execute the service. */
    durationValue: integer('duration_value').notNull(),
    durationUnit: durationUnit('duration_unit').notNull(),
    message: text('message'),
    status: offerStatus('status').notNull().default('submitted'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // One offer per specialist per request (revisions update the same row).
    unique('service_request_offers_request_specialist_key').on(table.serviceRequestId, table.specialistId),
    index('service_request_offers_specialist_idx').on(table.specialistId, table.updatedAt.desc()),
    check('service_request_offers_duration_positive', sql`${table.durationValue} > 0`),
  ],
);

/**
 * A specialist's personal "not for me" on a published request. The request
 * stays open for every other specialist; it only leaves this specialist's
 * pending list.
 */
export const serviceRequestDeclines = pgTable(
  'service_request_declines',
  {
    serviceRequestId: uuid('service_request_id')
      .notNull()
      .references(() => serviceRequests.id, { onDelete: 'cascade' }),
    specialistId: uuid('specialist_id')
      .notNull()
      .references(() => specialists.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.serviceRequestId, table.specialistId] }),
    index('service_request_declines_specialist_idx').on(table.specialistId),
  ],
);

/**
 * In-app notifications. `type` is one of `NotificationType`
 * (src/repositories/notifications.ts); `related_id` points at the record the
 * notification is about (a service request or a contract). `dedupe_key` makes
 * event fan-out idempotent: the same event never notifies a recipient twice.
 */
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
    dedupeKey: text('dedupe_key'),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp('read_at', { withTimezone: true }),
  },
  (table) => [
    index('notifications_recipient_idx').on(table.recipientUserId, table.createdAt.desc()),
    uniqueIndex('notifications_recipient_dedupe_key').on(table.recipientUserId, table.dedupeKey),
    index('notifications_unread_idx').on(table.recipientUserId).where(sql`${table.isRead} = false`),
  ],
);

