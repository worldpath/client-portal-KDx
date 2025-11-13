CREATE TABLE `file_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`url` text NOT NULL,
	`size` int NOT NULL,
	`changeDescription` text,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `file_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `files` ADD `currentVersion` int DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX `file_idx` ON `file_versions` (`fileId`);--> statement-breakpoint
CREATE INDEX `file_version_idx` ON `file_versions` (`fileId`,`versionNumber`);--> statement-breakpoint
CREATE INDEX `uploaded_by_idx` ON `file_versions` (`uploadedBy`);