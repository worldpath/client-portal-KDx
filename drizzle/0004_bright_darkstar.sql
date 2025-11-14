CREATE TABLE `comment_mentions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`commentId` int NOT NULL,
	`userId` int NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `comment_mentions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `file_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileId` int NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`parentId` int,
	`isEdited` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `file_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `comment_idx` ON `comment_mentions` (`commentId`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `comment_mentions` (`userId`);--> statement-breakpoint
CREATE INDEX `is_read_idx` ON `comment_mentions` (`isRead`);--> statement-breakpoint
CREATE INDEX `file_idx` ON `file_comments` (`fileId`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `file_comments` (`userId`);--> statement-breakpoint
CREATE INDEX `parent_idx` ON `file_comments` (`parentId`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `file_comments` (`createdAt`);