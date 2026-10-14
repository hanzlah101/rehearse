ALTER TABLE "feedback_requests" ADD COLUMN "spoken_seconds" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "daily_limit_seconds" integer DEFAULT 1800 NOT NULL;