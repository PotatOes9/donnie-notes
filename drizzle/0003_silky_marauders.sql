CREATE TABLE `article_view_totals` (
	`article_id` text PRIMARY KEY NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
