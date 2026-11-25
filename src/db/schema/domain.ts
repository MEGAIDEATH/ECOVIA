/**
 * ECOVIA domain tables: shared enums, profiles and documents.
 *
 * The relational model below stores profiles as normalized tables with real
 * foreign keys and PostgreSQL enums, replacing the flat document blobs the
 * prototype used.
 */
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { user } from './auth';

/** Approval state of a specialist/organization account. */
export const accountStatus = pgEnum('account_status', ['pending', 'approved', 'rejected']);

/** Which side of the marketplace a profile belongs to. */
export const profileKind = pgEnum('profile_kind', ['specialist', 'organization']);

/** Document purpose — mirrors the legacy Storage path prefixes. */
export const documentKind = pgEnum('document_kind', [
  'profile_image',
  'resume',
  'license',
  'commercial_registration',
]);

/**
 * Canonical Saudi regions (seeded by migration 0006, mirrored by
 * `src/lib/regions.ts`). `code` is the URL identifier; `name_ar` is the value
 * stored by the referencing columns (FK with ON UPDATE CASCADE).
 */
export const regions = pgTable('regions', {
  code: text('code').primaryKey(),
  nameAr: text('name_ar').notNull().unique(),
  sortOrder: smallint('sort_order').notNull().unique(),
});

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
    rejectionReason: text('rejection_reason'),
    fullName: text('full_name').notNull(),
    nationalId: text('national_id').notNull(),
    email: text('email'),
    phone: text('phone').notNull(),
    license: text('license').notNull(),
    issueDate: text('issue_date'),
    /** CV fields (legacy `saveCVSpecialist`). */
    edu: text('edu'),
    city: text('city'),
    /** Region the specialist serves; drives regional request notifications. */
    region: text('region').references(() => regions.nameAr, { onUpdate: 'cascade', onDelete: 'set null' }),
    years: text('years'),
    exp: text('exp'),
    portfolio: text('portfolio'),
    // Document references are real FKs: deleting a document clears the link.
    profileImageId: uuid('profile_image_id').references(() => documents.id, { onDelete: 'set null' }),
    resumeDocumentId: uuid('resume_document_id').references(() => documents.id, { onDelete: 'set null' }),
    licenseDocumentId: uuid('license_document_id').references(() => documents.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('specialists_status_idx').on(table.status),
    // Regional fan-out: approved specialists of one region.
    index('specialists_region_status_idx').on(table.region, table.status),
  ],
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
    rejectionReason: text('rejection_reason'),
    /** Canonical facility name (registration name; editable on the profile). */
    orgName: text('org_name').notNull(),
    crNumber: text('cr_number').notNull(),
    phone: text('phone').notNull(),
    /** "نبذة عن الجهة" — captured at registration, edited on the profile page. */
    orgDesc: text('org_desc').notNull(),
    /** Field(s) of business, short labels entered by the facility (≤ 10). */
    businessFields: text('business_fields').array().notNull().default(sql`'{}'::text[]`),
    /** Logo / profile picture (`documents.kind = 'profile_image'`). */
    profileImageId: uuid('profile_image_id').references(() => documents.id, { onDelete: 'set null' }),
    website: text('website'),
    crDocumentId: uuid('cr_document_id').references(() => documents.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('organizations_status_idx').on(table.status),
    check('organizations_business_fields_max', sql`cardinality(${table.businessFields}) <= 10`),
  ],
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
