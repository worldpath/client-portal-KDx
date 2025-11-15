ALTER TABLE `file_templates` ADD `fileName` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `file_templates` ADD `downloadCount` int DEFAULT 0 NOT NULL;