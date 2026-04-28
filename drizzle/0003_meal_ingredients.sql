CREATE TABLE `meal_ingredient` (
	`id` text PRIMARY KEY NOT NULL,
	`meal_id` text NOT NULL REFERENCES `meal`(`id`) ON DELETE CASCADE,
	`name` text NOT NULL,
	`quantity` text,
	`unit` text,
	`created_at` integer NOT NULL DEFAULT (unixepoch())
);
