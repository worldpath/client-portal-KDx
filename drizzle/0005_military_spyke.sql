ALTER TABLE `files` ADD `workflowStatus` enum('draft','under_review','approved','rejected') DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `files` ADD `reviewerId` int;--> statement-breakpoint
ALTER TABLE `files` ADD `reviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `files` ADD `reviewNotes` text;