-- 0006 marketplace: service types, public/private requests, offers, request-
-- linked contracts, regions lookup, facility profile fields, notification
-- dedupe. ADDITIVE ONLY: no table/column/value is dropped and every legacy row
-- stays valid (legacy requests keep service_name/cost/duration; the legacy
-- chat contract gets its parties backfilled from its conversation).
-- Manual rollback: drizzle/rollback/0006_down.sql (see the implementation report).
CREATE TYPE "public"."offer_status" AS ENUM('submitted', 'selected', 'accepted', 'declined', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."request_visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('activity_classification', 'construction_permit_category1', 'operational_permit_category1', 'environmental_management_plan');--> statement-breakpoint
ALTER TYPE "public"."contract_status" ADD VALUE 'cancelled';--> statement-breakpoint
CREATE TABLE "regions" (
	"code" text PRIMARY KEY NOT NULL,
	"name_ar" text NOT NULL,
	"sort_order" smallint NOT NULL,
	CONSTRAINT "regions_name_ar_unique" UNIQUE("name_ar"),
	CONSTRAINT "regions_sort_order_unique" UNIQUE("sort_order")
);
--> statement-breakpoint
-- Canonical list (mirrors src/lib/regions.ts; a unit test keeps them equal).
INSERT INTO "regions" ("code", "name_ar", "sort_order") VALUES
	('riyadh', 'منطقة الرياض', 1),
	('makkah', 'منطقة مكة المكرمة', 2),
	('madinah', 'منطقة المدينة المنورة', 3),
	('qassim', 'منطقة القصيم', 4),
	('eastern', 'المنطقة الشرقية', 5),
	('asir', 'منطقة عسير', 6),
	('tabuk', 'منطقة تبوك', 7),
	('hail', 'منطقة حائل', 8),
	('northern_borders', 'منطقة الحدود الشمالية', 9),
	('jazan', 'منطقة جازان', 10),
	('najran', 'منطقة نجران', 11),
	('al_bahah', 'منطقة الباحة', 12),
	('al_jawf', 'منطقة الجوف', 13)
ON CONFLICT ("code") DO NOTHING;--> statement-breakpoint
CREATE TABLE "service_request_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_request_id" uuid NOT NULL,
	"specialist_id" uuid NOT NULL,
	"duration_value" integer NOT NULL,
	"duration_unit" "duration_unit" NOT NULL,
	"message" text,
	"status" "offer_status" DEFAULT 'submitted' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_request_offers_request_specialist_key" UNIQUE("service_request_id","specialist_id"),
	CONSTRAINT "service_request_offers_duration_positive" CHECK ("service_request_offers"."duration_value" > 0)
);
--> statement-breakpoint
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_message_id_messages_id_fk";
--> statement-breakpoint
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_conversation_id_conversations_id_fk";
--> statement-breakpoint
ALTER TABLE "service_requests" ALTER COLUMN "service_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "service_requests" ALTER COLUMN "duration" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "service_request_id" uuid;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "offer_id" uuid;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "specialist_id" uuid;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "organization_signed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
-- Backfill legacy chat contracts: parties from the conversation, timestamps
-- from the announcing message (the facility signed when it created it).
UPDATE "contracts" AS c SET
	"organization_id" = conv."organization_id",
	"specialist_id" = conv."specialist_id",
	"created_at" = m."created_at",
	"organization_signed_at" = m."created_at",
	"updated_at" = COALESCE(c."signed_at", m."created_at")
FROM "conversations" AS conv, "messages" AS m
WHERE conv."id" = c."conversation_id" AND m."id" = c."message_id";--> statement-breakpoint
ALTER TABLE "contracts" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "contracts" ALTER COLUMN "specialist_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "business_fields" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "profile_image_id" uuid;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "specialists" ADD COLUMN "region" text;--> statement-breakpoint
-- Non-destructive backfill: derive the region from well-known city names.
UPDATE "specialists" SET "region" = v.region
FROM (VALUES
	('الرياض', 'منطقة الرياض'), ('الخرج', 'منطقة الرياض'),
	('مكة', 'منطقة مكة المكرمة'), ('مكة المكرمة', 'منطقة مكة المكرمة'), ('جدة', 'منطقة مكة المكرمة'), ('الطائف', 'منطقة مكة المكرمة'),
	('المدينة', 'منطقة المدينة المنورة'), ('المدينة المنورة', 'منطقة المدينة المنورة'), ('ينبع', 'منطقة المدينة المنورة'),
	('بريدة', 'منطقة القصيم'), ('عنيزة', 'منطقة القصيم'),
	('الدمام', 'المنطقة الشرقية'), ('الخبر', 'المنطقة الشرقية'), ('الظهران', 'المنطقة الشرقية'), ('الأحساء', 'المنطقة الشرقية'), ('الجبيل', 'المنطقة الشرقية'),
	('أبها', 'منطقة عسير'), ('خميس مشيط', 'منطقة عسير'),
	('تبوك', 'منطقة تبوك'), ('حائل', 'منطقة حائل'), ('عرعر', 'منطقة الحدود الشمالية'),
	('جازان', 'منطقة جازان'), ('جيزان', 'منطقة جازان'), ('نجران', 'منطقة نجران'),
	('الباحة', 'منطقة الباحة'), ('سكاكا', 'منطقة الجوف')
) AS v(city, region)
WHERE btrim("specialists"."city") = v.city AND "specialists"."region" IS NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "dedupe_key" text;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "service_types" "service_type"[] DEFAULT '{}'::service_type[] NOT NULL;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "activity_description" text;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "visibility" "request_visibility" DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "target_specialist_id" uuid;--> statement-breakpoint
ALTER TABLE "service_request_offers" ADD CONSTRAINT "service_request_offers_service_request_id_service_requests_id_fk" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_request_offers" ADD CONSTRAINT "service_request_offers_specialist_id_specialists_id_fk" FOREIGN KEY ("specialist_id") REFERENCES "public"."specialists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "service_request_offers_specialist_idx" ON "service_request_offers" USING btree ("specialist_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_service_request_id_service_requests_id_fk" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_offer_id_service_request_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."service_request_offers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_specialist_id_specialists_id_fk" FOREIGN KEY ("specialist_id") REFERENCES "public"."specialists"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_profile_image_id_documents_id_fk" FOREIGN KEY ("profile_image_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specialists" ADD CONSTRAINT "specialists_region_regions_name_ar_fk" FOREIGN KEY ("region") REFERENCES "public"."regions"("name_ar") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_target_specialist_id_specialists_id_fk" FOREIGN KEY ("target_specialist_id") REFERENCES "public"."specialists"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_region_regions_name_ar_fk" FOREIGN KEY ("region") REFERENCES "public"."regions"("name_ar") ON DELETE restrict ON UPDATE cascade NOT VALID;--> statement-breakpoint
-- New rows are always checked; existing rows are validated here only when all
-- of them already use a canonical region (otherwise the migration still
-- succeeds and the report's data-quality query lists the offending rows).
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM "service_requests" sr
		WHERE NOT EXISTS (SELECT 1 FROM "regions" r WHERE r."name_ar" = sr."region")
	) THEN
		ALTER TABLE "service_requests" VALIDATE CONSTRAINT "service_requests_region_regions_name_ar_fk";
	END IF;
END $$;--> statement-breakpoint
CREATE INDEX "contracts_organization_idx" ON "contracts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "contracts_specialist_idx" ON "contracts" USING btree ("specialist_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contracts_one_signed_per_request" ON "contracts" USING btree ("service_request_id") WHERE "contracts"."status" = 'signed';--> statement-breakpoint
CREATE UNIQUE INDEX "contracts_one_pending_per_request" ON "contracts" USING btree ("service_request_id") WHERE "contracts"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "specialists_region_status_idx" ON "specialists" USING btree ("region","status");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_recipient_dedupe_key" ON "notifications" USING btree ("recipient_user_id","dedupe_key");--> statement-breakpoint
CREATE INDEX "notifications_unread_idx" ON "notifications" USING btree ("recipient_user_id") WHERE "notifications"."is_read" = false;--> statement-breakpoint
CREATE INDEX "service_requests_open_public_idx" ON "service_requests" USING btree ("region","created_at" DESC NULLS LAST) WHERE "service_requests"."status" = 'pending' AND "service_requests"."visibility" = 'public';--> statement-breakpoint
CREATE INDEX "service_requests_target_idx" ON "service_requests" USING btree ("target_specialist_id","status") WHERE "service_requests"."target_specialist_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_signed_requires_signature" CHECK ("contracts"."status" <> 'signed' OR ("contracts"."specialist_signature" IS NOT NULL AND "contracts"."signed_at" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_business_fields_max" CHECK (cardinality("organizations"."business_fields") <= 10);--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_visibility_target" CHECK (("service_requests"."visibility" = 'private') = ("service_requests"."target_specialist_id" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_content_required" CHECK ("service_requests"."service_name" IS NOT NULL OR (cardinality("service_requests"."service_types") > 0 AND "service_requests"."activity_description" IS NOT NULL));