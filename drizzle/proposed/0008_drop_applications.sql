-- PROPOSED — NOT in drizzle/meta/_journal.json, NOT applied anywhere.
-- Requires explicit owner approval (destructive). Evidence (2026-11-26 audit):
--   * `applications` has 0 rows in dev, preview and demo;
--   * no application code reads or writes it since the "apply to organization"
--     flow and /api/applications were removed (superseded by service_request_offers);
--   * only the schema definition and historical migrations reference it.
-- Before applying: re-run `select count(*) from applications` on the target;
-- abort if it is not 0. Then remove the table from src/db/schema/engagement.ts
-- and generate the migration with drizzle-kit so the snapshot stays consistent.
BEGIN;
DO $$ BEGIN
	IF (SELECT count(*) FROM "applications") > 0 THEN
		RAISE EXCEPTION 'applications is not empty — archive it first';
	END IF;
END $$;
DROP TABLE "applications";
DROP TYPE "public"."application_status";
COMMIT;
