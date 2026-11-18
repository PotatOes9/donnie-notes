CREATE TABLE `article_view_events` (
	`event_id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`viewed_at` text NOT NULL,
	`request_id` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `visitor_daily` ADD `article_views` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `visitor_daily` ADD `end_article_views` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `visitor_state` ADD `article_views` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `visitor_state` ADD `views_started_at` text;--> statement-breakpoint
ALTER TABLE `visitor_state` ADD `recent_views_json` text DEFAULT '[]' NOT NULL;