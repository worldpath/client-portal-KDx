CREATE TABLE `file_reviewers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileId` int NOT NULL,
	`reviewerId` int NOT NULL,
	`reviewStatus` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewNotes` text,
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	CONSTRAINT `file_reviewers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `file_idx` ON `file_reviewers` (`fileId`);--> statement-breakpoint
CREATE INDEX `reviewer_idx` ON `file_reviewers` (`reviewerId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `file_reviewers` (`reviewStatus`);--> statement-breakpoint
CREATE INDEX `unique_file_reviewer` ON `file_reviewers` (`fileId`,`reviewerId`);