CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"student_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "topics_shared_title_idx" ON "topics" USING btree (lower("title")) WHERE "topics"."student_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "topics_student_title_idx" ON "topics" USING btree ("student_id",lower("title")) WHERE "topics"."student_id" is not null;