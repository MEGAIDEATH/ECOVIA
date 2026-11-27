-- Manual rollback of drizzle/0006_marketplace_offers_contracts.sql.
--
-- Run ONLY after taking a Neon snapshot/branch of the target database, and
-- only if the application version deployed against that database predates
-- 0006. Data created through the 0006 features (offers, request-linked
-- contracts, service types, private requests, notification dedupe keys,
-- facility logos/fields/websites, specialist regions) is DISCARDED by this
-- script; legacy data is untouched.
--
--   psql "$DATABASE_URL_UNPOOLED" -v ON_ERROR_STOP=1 -f drizzle/rollback/0006_down.sql
--
-- The script refuses to run while contracts exist that only the new model can
-- represent (request-linked or cancelled), so they are never dropped silently.
BEGIN;

DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM "contracts" WHERE "service_request_id" IS NOT NULL OR "status"::text = 'cancelled') THEN
		RAISE EXCEPTION 'Rollback refused: request-linked or cancelled contracts exist. Export them first.';
	END IF;
END $$;

-- Contracts: restore the pre-0006 shape and cascade behaviour.
DROP INDEX IF EXISTS "contracts_one_signed_per_request";
DROP INDEX IF EXISTS "contracts_one_pending_per_request";
DROP INDEX IF EXISTS "contracts_organization_idx";
DROP INDEX IF EXISTS "contracts_specialist_idx";
ALTER TABLE "contracts" DROP CONSTRAINT IF EXISTS "contracts_signed_requires_signature";
ALTER TABLE "contracts" DROP CONSTRAINT IF EXISTS "contracts_service_request_id_service_requests_id_fk";
ALTER TABLE "contracts" DROP CONSTRAINT IF EXISTS "contracts_offer_id_service_request_offers_id_fk";
ALTER TABLE "contracts" DROP CONSTRAINT IF EXISTS "contracts_organization_id_organizations_id_fk";
ALTER TABLE "contracts" DROP CONSTRAINT IF EXISTS "contracts_specialist_id_specialists_id_fk";
ALTER TABLE "contracts" DROP CONSTRAINT IF EXISTS "contracts_message_id_messages_id_fk";
ALTER TABLE "contracts" DROP CONSTRAINT IF EXISTS "contracts_conversation_id_conversations_id_fk";
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "contracts"
	DROP COLUMN IF EXISTS "service_request_id",
	DROP COLUMN IF EXISTS "offer_id",
	DROP COLUMN IF EXISTS "organization_id",
	DROP COLUMN IF EXISTS "specialist_id",
	DROP COLUMN IF EXISTS "organization_signed_at",
	DROP COLUMN IF EXISTS "cancelled_at",
	DROP COLUMN IF EXISTS "created_at",
	DROP COLUMN IF EXISTS "updated_at";

-- contract_status: PostgreSQL cannot drop an enum value, so the type is rebuilt
-- (safe: no row uses 'cancelled', checked above).
ALTER TABLE "contracts" ALTER COLUMN "status" DROP DEFAULT;
ALTER TYPE "public"."contract_status" RENAME TO "contract_status_0006";
CREATE TYPE "public"."contract_status" AS ENUM('pending', 'signed');
ALTER TABLE "contracts" ALTER COLUMN "status" TYPE "public"."contract_status" USING "status"::text::"public"."contract_status";
ALTER TABLE "contracts" ALTER COLUMN "status" SET DEFAULT 'pending';
DROP INDEX IF EXISTS "contracts_status_idx";
CREATE INDEX "contracts_status_idx" ON "contracts" USING btree ("status");
DROP TYPE "public"."contract_status_0006";

-- Offers.
DROP TABLE IF EXISTS "service_request_offers";
DROP TYPE IF EXISTS "public"."offer_status";

-- Service requests: drop 0006 columns/constraints. Rows created by the new form
-- have no service_name; give them a readable one before NOT NULL returns.
DROP INDEX IF EXISTS "service_requests_open_public_idx";
DROP INDEX IF EXISTS "service_requests_target_idx";
ALTER TABLE "service_requests" DROP CONSTRAINT IF EXISTS "service_requests_visibility_target";
ALTER TABLE "service_requests" DROP CONSTRAINT IF EXISTS "service_requests_content_required";
ALTER TABLE "service_requests" DROP CONSTRAINT IF EXISTS "service_requests_target_specialist_id_specialists_id_fk";
ALTER TABLE "service_requests" DROP CONSTRAINT IF EXISTS "service_requests_region_regions_name_ar_fk";
UPDATE "service_requests" SET "service_name" = COALESCE("service_name", array_to_string("service_types"::text[], ', '), 'طلب خدمة');
UPDATE "service_requests" SET "duration" = COALESCE("duration", 'غير محددة');
ALTER TABLE "service_requests" ALTER COLUMN "service_name" SET NOT NULL;
ALTER TABLE "service_requests" ALTER COLUMN "duration" SET NOT NULL;
ALTER TABLE "service_requests"
	DROP COLUMN IF EXISTS "service_types",
	DROP COLUMN IF EXISTS "activity_description",
	DROP COLUMN IF EXISTS "notes",
	DROP COLUMN IF EXISTS "visibility",
	DROP COLUMN IF EXISTS "target_specialist_id";
DROP TYPE IF EXISTS "public"."service_type";
DROP TYPE IF EXISTS "public"."request_visibility";

-- Profiles.
DROP INDEX IF EXISTS "specialists_region_status_idx";
ALTER TABLE "specialists" DROP CONSTRAINT IF EXISTS "specialists_region_regions_name_ar_fk";
ALTER TABLE "specialists" DROP COLUMN IF EXISTS "region";
ALTER TABLE "organizations" DROP CONSTRAINT IF EXISTS "organizations_business_fields_max";
ALTER TABLE "organizations" DROP CONSTRAINT IF EXISTS "organizations_profile_image_id_documents_id_fk";
ALTER TABLE "organizations"
	DROP COLUMN IF EXISTS "business_fields",
	DROP COLUMN IF EXISTS "profile_image_id",
	DROP COLUMN IF EXISTS "website";

-- Notifications.
DROP INDEX IF EXISTS "notifications_recipient_dedupe_key";
DROP INDEX IF EXISTS "notifications_unread_idx";
ALTER TABLE "notifications" DROP COLUMN IF EXISTS "dedupe_key";

-- Regions lookup (after every referencing FK is gone).
DROP TABLE IF EXISTS "regions";

-- Forget the migration so `npm run db:migrate` can re-apply it later.
DELETE FROM "drizzle"."__drizzle_migrations"
WHERE "hash" = (SELECT "hash" FROM "drizzle"."__drizzle_migrations" ORDER BY "created_at" DESC LIMIT 1)
	AND (SELECT count(*) FROM "drizzle"."__drizzle_migrations") = 7;

COMMIT;
