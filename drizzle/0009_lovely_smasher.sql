CREATE TABLE `notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`emailReviewerAssignment` boolean NOT NULL DEFAULT true,
	`emailStatusChange` boolean NOT NULL DEFAULT true,
	`emailMentions` boolean NOT NULL DEFAULT true,
	`emailShareLinks` boolean NOT NULL DEFAULT true,
	`deliveryMode` enum('instant','daily_digest') NOT NULL DEFAULT 'instant',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_preferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `user_idx` ON `notification_preferences` (`userId`);