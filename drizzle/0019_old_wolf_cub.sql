CREATE TABLE `file_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`categoryId` int NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`mimeType` varchar(100),
	`size` int NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`downloadCount` int NOT NULL DEFAULT 0,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `file_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `template_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `template_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `file_templates` ADD CONSTRAINT `file_templates_categoryId_template_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `template_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `file_templates` ADD CONSTRAINT `file_templates_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `template_categories` ADD CONSTRAINT `template_categories_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;