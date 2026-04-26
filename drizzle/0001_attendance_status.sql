ALTER TABLE `attendance` ADD COLUMN `status` text DEFAULT 'pending' NOT NULL;
UPDATE `attendance` SET `status` = CASE WHEN `confirmed` = 1 THEN 'confirmed' ELSE 'pending' END;
ALTER TABLE `attendance` DROP COLUMN `confirmed`;
