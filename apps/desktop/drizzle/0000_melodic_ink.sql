CREATE TABLE `attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`rehearsal_id` text NOT NULL,
	`status` text NOT NULL,
	`recording_path` text NOT NULL,
	`mime_type` text NOT NULL,
	`spoken_seconds` integer DEFAULT 0 NOT NULL,
	`score` integer,
	`feedback` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`rehearsal_id`) REFERENCES `rehearsals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `attempts_rehearsal_idx` ON `attempts` (`rehearsal_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `rehearsals` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`topic_id` text,
	`topic` text NOT NULL,
	`target_seconds` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rehearsals_topic_idx` ON `rehearsals` (`student_id`,`topic_id`,`target_seconds`);--> statement-breakpoint
CREATE INDEX `rehearsals_student_idx` ON `rehearsals` (`student_id`,`updated_at`);