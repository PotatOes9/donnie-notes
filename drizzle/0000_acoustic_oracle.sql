CREATE TABLE `blog_connection` (
	`id` integer PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`encrypted_config` text NOT NULL,
	`title` text NOT NULL,
	`database_id` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `connection_locks` (
	`id` integer PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`expires_at` integer NOT NULL
);
