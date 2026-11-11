CREATE TYPE "public"."duration_unit" AS ENUM('day', 'week', 'month');--> statement-breakpoint
ALTER TYPE "public"."service_request_status" ADD VALUE 'cancelled';--> statement-breakpoint
CREATE TABLE "service_request_declines" (
	"service_request_id" uuid NOT NULL,
	"specialist_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_request_declines_service_request_id_specialist_id_pk" PRIMARY KEY("service_request_id","specialist_id")
);
--> statement-breakpoint
DROP INDEX "conversations_organization_idx";--> statement-breakpoint
DROP INDEX "service_requests_status_idx";--> statement-breakpoint
ALTER TABLE "service_requests" ALTER COLUMN "service_category" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "service_requests" ALTER COLUMN "city" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "cost" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "duration_value" integer;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "duration_unit" "duration_unit";--> statement-breakpoint
ALTER TABLE "service_request_declines" ADD CONSTRAINT "service_request_declines_service_request_id_service_requests_id_fk" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_request_declines" ADD CONSTRAINT "service_request_declines_specialist_id_specialists_id_fk" FOREIGN KEY ("specialist_id") REFERENCES "public"."specialists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "service_request_declines_specialist_idx" ON "service_request_declines" USING btree ("specialist_id");--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_cr_document_id_documents_id_fk" FOREIGN KEY ("cr_document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specialists" ADD CONSTRAINT "specialists_profile_image_id_documents_id_fk" FOREIGN KEY ("profile_image_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specialists" ADD CONSTRAINT "specialists_resume_document_id_documents_id_fk" FOREIGN KEY ("resume_document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specialists" ADD CONSTRAINT "specialists_license_document_id_documents_id_fk" FOREIGN KEY ("license_document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "contracts_conversation_idx" ON "contracts" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "service_requests_status_created_idx" ON "service_requests" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_cost_nonnegative" CHECK ("service_requests"."cost" IS NULL OR "service_requests"."cost" >= 0);--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_duration_pair" CHECK (("service_requests"."duration_value" IS NULL) = ("service_requests"."duration_unit" IS NULL) AND ("service_requests"."duration_value" IS NULL OR "service_requests"."duration_value" > 0));--> statement-breakpoint
-- Data step (non-destructive): canonicalize region names that unambiguously
-- match one of the 13 Saudi regions; any other value is left untouched.
UPDATE "service_requests" SET "region" = CASE "region"
	WHEN 'الرياض' THEN 'منطقة الرياض'
	WHEN 'مكة' THEN 'منطقة مكة المكرمة'
	WHEN 'مكة المكرمة' THEN 'منطقة مكة المكرمة'
	WHEN 'المدينة' THEN 'منطقة المدينة المنورة'
	WHEN 'المدينة المنورة' THEN 'منطقة المدينة المنورة'
	WHEN 'القصيم' THEN 'منطقة القصيم'
	WHEN 'الشرقية' THEN 'المنطقة الشرقية'
	WHEN 'عسير' THEN 'منطقة عسير'
	WHEN 'تبوك' THEN 'منطقة تبوك'
	WHEN 'حائل' THEN 'منطقة حائل'
	WHEN 'الحدود الشمالية' THEN 'منطقة الحدود الشمالية'
	WHEN 'جازان' THEN 'منطقة جازان'
	WHEN 'نجران' THEN 'منطقة نجران'
	WHEN 'الباحة' THEN 'منطقة الباحة'
	WHEN 'الجوف' THEN 'منطقة الجوف'
	ELSE "region" END;--> statement-breakpoint
-- Backfill the structured duration only where the legacy label is unambiguous.
UPDATE "service_requests" SET "duration_value" = v.n, "duration_unit" = v.u::"duration_unit"
FROM (VALUES ('يوم', 1, 'day'), ('يومين', 2, 'day'), ('أسبوع', 1, 'week'), ('أسبوعين', 2, 'week'),
             ('شهر', 1, 'month'), ('شهرين', 2, 'month')) AS v(label, n, u)
WHERE "service_requests"."duration" = v.label AND "service_requests"."duration_value" IS NULL;
