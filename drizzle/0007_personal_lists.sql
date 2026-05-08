CREATE TABLE `personal_list` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `name` text NOT NULL,
  `created_at` integer NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE `personal_list_item` (
  `id` text PRIMARY KEY NOT NULL,
  `list_id` text NOT NULL REFERENCES `personal_list`(`id`) ON DELETE CASCADE,
  `name` text NOT NULL,
  `created_at` integer NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE `juntada_personal_item` (
  `id` text PRIMARY KEY NOT NULL,
  `juntada_id` text NOT NULL REFERENCES `juntada`(`id`) ON DELETE CASCADE,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `name` text NOT NULL,
  `checked` integer NOT NULL DEFAULT 0,
  `created_at` integer NOT NULL DEFAULT (unixepoch())
);
