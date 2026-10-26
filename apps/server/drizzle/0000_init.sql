CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'owned' NOT NULL,
	`title` text NOT NULL,
	`subtitle` text DEFAULT '' NOT NULL,
	`creators` text DEFAULT '[]' NOT NULL,
	`publisher` text DEFAULT '' NOT NULL,
	`original_year` integer,
	`edition_year` integer,
	`series_name` text DEFAULT '' NOT NULL,
	`series_number` text DEFAULT '' NOT NULL,
	`location_id` text,
	`language` text DEFAULT '' NOT NULL,
	`barcode` text DEFAULT '' NOT NULL,
	`cover` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`loan_to` text,
	`loan_since` text,
	`added_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `items_type_status_idx` ON `items` (`type`,`status`);--> statement-breakpoint
CREATE INDEX `items_location_idx` ON `items` (`location_id`);--> statement-breakpoint
CREATE INDEX `items_barcode_idx` ON `items` (`barcode`);--> statement-breakpoint
CREATE INDEX `items_deleted_idx` ON `items` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `locations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`parent_id` text,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `locations_parent_idx` ON `locations` (`parent_id`);