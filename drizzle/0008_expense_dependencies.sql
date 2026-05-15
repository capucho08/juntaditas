CREATE TABLE `expense_dependency` (
  `id` text PRIMARY KEY NOT NULL,
  `juntada_id` text NOT NULL REFERENCES `juntada`(`id`) ON DELETE CASCADE,
  `dependent_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `covered_by_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `created_at` integer NOT NULL DEFAULT (unixepoch())
);
