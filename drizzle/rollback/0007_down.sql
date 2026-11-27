-- Manual rollback of drizzle/0007_review_history_indexes.sql (indexes only; no data impact).
BEGIN;
DROP INDEX IF EXISTS "contracts_offer_idx";
DROP INDEX IF EXISTS "account_events_target_idx";
DELETE FROM "drizzle"."__drizzle_migrations"
WHERE "hash" = (SELECT "hash" FROM "drizzle"."__drizzle_migrations" ORDER BY "created_at" DESC LIMIT 1)
	AND (SELECT count(*) FROM "drizzle"."__drizzle_migrations") = 8;
COMMIT;
