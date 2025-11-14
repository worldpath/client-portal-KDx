ALTER TABLE `files` ADD `expiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `files` ADD `isArchived` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `files` ADD `archivedAt` timestamp;--> statement-breakpoint
ALTER TABLE `files` ADD `archivedBy` int;