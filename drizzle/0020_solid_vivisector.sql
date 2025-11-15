CREATE TABLE `template_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`mimeType` varchar(100),
	`size` int NOT NULL,
	`downloadCount` int NOT NULL DEFAULT 0,
	`isLatest` int NOT NULL DEFAULT true,
	`uploadedBy` int NOT NULL,
	`changeNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `template_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `template_versions` ADD CONSTRAINT `template_versions_templateId_file_templates_id_fk` FOREIGN KEY (`templateId`) REFERENCES `file_templates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `template_versions` ADD CONSTRAINT `template_versions_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;