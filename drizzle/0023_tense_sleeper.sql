DROP TABLE `workflow_templates`;--> statement-breakpoint
ALTER TABLE `file_templates` DROP FOREIGN KEY `file_templates_uploadedBy_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `file_templates` MODIFY COLUMN `fileKey` varchar(512) NOT NULL;--> statement-breakpoint
ALTER TABLE `file_templates` MODIFY COLUMN `mimeType` varchar(127);--> statement-breakpoint
ALTER TABLE `file_templates` ADD `createdBy` int NOT NULL;--> statement-breakpoint
ALTER TABLE `file_templates` ADD `createdFromRequestId` int;--> statement-breakpoint
ALTER TABLE `file_templates` ADD CONSTRAINT `file_templates_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `file_templates` ADD CONSTRAINT `file_templates_createdFromRequestId_template_requests_id_fk` FOREIGN KEY (`createdFromRequestId`) REFERENCES `template_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `file_templates` DROP COLUMN `fileName`;--> statement-breakpoint
ALTER TABLE `file_templates` DROP COLUMN `size`;--> statement-breakpoint
ALTER TABLE `file_templates` DROP COLUMN `version`;--> statement-breakpoint
ALTER TABLE `file_templates` DROP COLUMN `downloadCount`;--> statement-breakpoint
ALTER TABLE `file_templates` DROP COLUMN `uploadedBy`;