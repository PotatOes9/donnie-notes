CREATE TABLE `home_view_events` (
	`event_id` text PRIMARY KEY NOT NULL,
	`viewed_at` text NOT NULL,
	`request_id` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `visitor_daily` ADD `home_views` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `visitor_daily` ADD `end_home_views` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `visitor_state` ADD `home_views` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `visitor_state` ADD `home_views_started_at` text;--> statement-breakpoint
ALTER TABLE `visitor_state` ADD `recent_home_views_json` text DEFAULT '[]' NOT NULL;