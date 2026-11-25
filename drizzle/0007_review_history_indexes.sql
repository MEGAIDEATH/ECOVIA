-- 0007: indexes for actual query patterns found in the database audit (review
-- history by profile; contract lookups by offer). Additive; rollback:
-- drizzle/rollback/0007_down.sql
CREATE INDEX IF NOT EXISTS "contracts_offer_idx" ON "contracts" USING btree ("offer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_events_target_idx" ON "account_events" USING btree ("target_id","created_at");