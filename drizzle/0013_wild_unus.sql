CREATE TABLE `file_workflow_instances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileId` int NOT NULL,
	`workflowTemplateId` int NOT NULL,
	`currentStageId` int,
	`status` enum('in_progress','completed','rejected') NOT NULL DEFAULT 'in_progress',
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `file_workflow_instances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `file_workflow_stage_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workflowInstanceId` int NOT NULL,
	`stageId` int NOT NULL,
	`status` enum('pending','in_progress','approved','rejected') NOT NULL DEFAULT 'pending',
	`assignedReviewers` text,
	`approvedBy` text,
	`rejectedBy` int,
	`rejectionReason` text,
	`startedAt` timestamp,
	`completedAt` timestamp,
	CONSTRAINT `file_workflow_stage_progress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_stages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workflowTemplateId` int NOT NULL,
	`stageName` varchar(255) NOT NULL,
	`stageOrder` int NOT NULL,
	`requiredApprovals` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workflow_stages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`isActive` int NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflow_templates_id` PRIMARY KEY(`id`)
);
