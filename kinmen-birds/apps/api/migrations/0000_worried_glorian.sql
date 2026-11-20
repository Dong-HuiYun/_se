CREATE TABLE `birds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name_zh` text NOT NULL,
	`name_en` text NOT NULL,
	`scientific_name` text NOT NULL,
	`family_zh` text,
	`description` text NOT NULL,
	`habits` text,
	`residency` text NOT NULL,
	`present_months` text,
	`iucn_status` text,
	`tw_protection_level` text,
	`image_key` text,
	`audio_key` text,
	`model_key` text,
	`model_scale` real DEFAULT 1,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `birds_slug_unique` ON `birds` (`slug`);--> statement-breakpoint
CREATE TABLE `sightings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bird_id` integer NOT NULL,
	`location_name` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`habitat_type` text,
	`best_season` text,
	`abundance` text DEFAULT 'common',
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`bird_id`) REFERENCES `birds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sightings_bird` ON `sightings` (`bird_id`);--> statement-breakpoint
CREATE INDEX `idx_sightings_geo` ON `sightings` (`lat`,`lng`);--> statement-breakpoint
CREATE TABLE `user_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bird_id` integer NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`observed_at` integer NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	`observer_name` text,
	`notes` text,
	`photo_key` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`ip_hash` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`bird_id`) REFERENCES `birds`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_reports_bird` ON `user_reports` (`bird_id`);--> statement-breakpoint
CREATE INDEX `idx_reports_status` ON `user_reports` (`status`);