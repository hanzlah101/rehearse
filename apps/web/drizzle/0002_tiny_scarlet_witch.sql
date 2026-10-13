CREATE TABLE "feedback_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"attempt_id" uuid NOT NULL,
	"status" text NOT NULL,
	"stage" text NOT NULL,
	"input" jsonb NOT NULL,
	"result" jsonb,
	"error" text,
	"tokens_in" integer DEFAULT 0 NOT NULL,
	"tokens_out" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "key_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"target_seconds" integer NOT NULL,
	"points" jsonb NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback_jobs" ADD CONSTRAINT "feedback_jobs_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_points" ADD CONSTRAINT "key_points_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "feedback_jobs_attempt_idx" ON "feedback_jobs" USING btree ("student_id","attempt_id");--> statement-breakpoint
CREATE INDEX "feedback_jobs_student_created_idx" ON "feedback_jobs" USING btree ("student_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "key_points_topic_target_idx" ON "key_points" USING btree ("topic_id","target_seconds");