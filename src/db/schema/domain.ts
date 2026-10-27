/**
 * ECOVIA domain tables: shared enums, profiles and documents.
 *
 * The relational model below stores profiles as normalized tables with real
 * foreign keys and PostgreSQL enums, replacing the flat document blobs the
 * prototype used.
 */
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { user } from './auth';

/** Approval state of a specialist/organization account. */
export const accountStatus = pgEnum('account_status', ['pending', 'approved']);

/** Which side of the marketplace a profile belongs to. */
export const profileKind = pgEnum('profile_kind', ['specialist', 'organization']);

/** Document purpose — mirrors the legacy Storage path prefixes. */
export const documentKind = pgEnum('document_kind', [
  'profile_image',
  'resume',
  'license',
  'commercial_registration',
]);

export const specialists = pgTable(
  'specialists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Owning account. One profile per user (legacy: doc id === auth uid). */
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: accountStatus('status').notNull().default('pending'),
    fullName: text('full_name').notNull(),
    nationalId: text('national_id').notNull(),
    email: text('email'),
    phone: text('phone').notNull(),
    license: text('license').notNull(),
    issueDate: text('issue_date'),
    /** CV fields (legacy `saveCVSpecialist`). */
    edu: text('edu'),
    years: text('years'),
    exp: text('exp'),
    portfolio: text('portfolio'),
    profileImageId: uuid('profile_image_id'),
    resumeDocumentId: uuid('resume_document_id'),
    licenseDocumentId: uuid('license_document_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('specialists_status_idx').on(table.status)],
);

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: accountStatus('status').notNull().default('pending'),
    orgName: text('org_name').notNull(),
    crNumber: text('cr_number').notNull(),
    phone: text('phone').notNull(),
    orgDesc: text('org_desc').notNull(),
    crDocumentId: uuid('cr_document_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('organizations_status_idx').on(table.status)],
);

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    kind: documentKind('kind').notNull(),
    /** Object key inside the configured storage provider (never a public URL). */
    storageKey: text('storage_key').notNull().unique(),
    contentType: text('content_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    originalName: text('original_name'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('documents_owner_idx').on(table.ownerUserId)],
);
