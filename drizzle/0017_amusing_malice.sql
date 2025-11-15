CREATE TABLE `workflow_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workflowInstanceId` int NOT NULL,
	`stageId` int NOT NULL,
	`fileId` int NOT NULL,
	`userId` int NOT NULL,
	`commentType` enum('approval','rejection','reply') NOT NULL,
	`content` text NOT NULL,
	`parentCommentId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflow_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `workflow_instance_idx` ON `workflow_comments` (`workflowInstanceId`);--> statement-breakpoint
CREATE INDEX `stage_idx` ON `workflow_comments` (`stageId`);--> statement-breakpoint
CREATE INDEX `file_idx` ON `workflow_comments` (`fileId`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `workflow_comments` (`userId`);--> statement-breakpoint
CREATE INDEX `parent_comment_idx` ON `workflow_comments` (`parentCommentId`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `workflow_comments` (`createdAt`);