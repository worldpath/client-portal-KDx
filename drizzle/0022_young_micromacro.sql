CREATE TABLE `template_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requesterId` int NOT NULL,
	`templateName` varchar(255) NOT NULL,
	`description` text,
	`justification` text NOT NULL,
	`categoryId` int,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`adminId` int,
	`adminComment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `template_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `template_requests` ADD CONSTRAINT `template_requests_requesterId_users_id_fk` FOREIGN KEY (`requesterId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `template_requests` ADD CONSTRAINT `template_requests_categoryId_template_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `template_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `template_requests` ADD CONSTRAINT `template_requests_adminId_users_id_fk` FOREIGN KEY (`adminId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;