CREATE TABLE `share_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileId` int NOT NULL,
	`token` varchar(64) NOT NULL,
	`createdBy` int NOT NULL,
	`password` varchar(255),
	`expiresAt` timestamp,
	`maxDownloads` int,
	`downloadCount` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastAccessedAt` timestamp,
	CONSTRAINT `share_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `share_links_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE INDEX `file_idx` ON `share_links` (`fileId`);--> statement-breakpoint
CREATE INDEX `token_idx` ON `share_links` (`token`);--> statement-breakpoint
CREATE INDEX `created_by_idx` ON `share_links` (`createdBy`);