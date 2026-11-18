CREATE TABLE `visitor_daily` (
	`date` text PRIMARY KEY NOT NULL,
	`new_visitors` integer DEFAULT 0 NOT NULL,
	`end_total` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `visitor_keys` (
	`browser_hash` text PRIMARY KEY NOT NULL,
	`ordinal` integer NOT NULL,
	`first_seen_at` text NOT NULL,
	`registration_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `visitor_keys_ordinal_unique` ON `visitor_keys` (`ordinal`);--> statement-breakpoint
CREATE TABLE `visitor_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`started_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`recent_days_json` text DEFAULT '[]' NOT NULL
);
