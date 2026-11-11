CREATE TABLE "otp_rate_limit" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL
);
