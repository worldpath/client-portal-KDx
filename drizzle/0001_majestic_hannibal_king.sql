CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` varchar(64) NOT NULL,
	`entityType` varchar(32) NOT NULL,
	`entityId` int,
	`details` text,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`url` text NOT NULL,
	`mimeType` varchar(127),
	`size` int NOT NULL,
	`folderId` int NOT NULL,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `folder_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`folderId` int NOT NULL,
	`userId` int NOT NULL,
	`canView` boolean NOT NULL DEFAULT true,
	`canUpload` boolean NOT NULL DEFAULT false,
	`canEdit` boolean NOT NULL DEFAULT false,
	`canDelete` boolean NOT NULL DEFAULT false,
	`grantedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `folder_permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `folders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`parentId` int,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `folders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`role` enum('admin','client') NOT NULL DEFAULT 'client',
	`invitedBy` int NOT NULL,
	`token` varchar(64) NOT NULL,
	`status` enum('pending','accepted','expired') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_invitations_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','client') NOT NULL DEFAULT 'client';--> statement-breakpoint
CREATE INDEX `user_idx` ON `audit_logs` (`userId`);--> statement-breakpoint
CREATE INDEX `action_idx` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `entity_idx` ON `audit_logs` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `audit_logs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `folder_idx` ON `files` (`folderId`);--> statement-breakpoint
CREATE INDEX `uploaded_by_idx` ON `files` (`uploadedBy`);--> statement-breakpoint
CREATE INDEX `folder_user_idx` ON `folder_permissions` (`folderId`,`userId`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `folder_permissions` (`userId`);--> statement-breakpoint
CREATE INDEX `parent_idx` ON `folders` (`parentId`);--> statement-breakpoint
CREATE INDEX `created_by_idx` ON `folders` (`createdBy`);--> statement-breakpoint
CREATE INDEX `email_idx` ON `user_invitations` (`email`);--> statement-breakpoint
CREATE INDEX `token_idx` ON `user_invitations` (`token`);