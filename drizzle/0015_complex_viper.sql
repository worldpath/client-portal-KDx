ALTER TABLE `file_workflow_stage_progress` ADD `actionTimestamp` timestamp;--> statement-breakpoint
ALTER TABLE `file_workflow_stage_progress` ADD `actionUserId` int;--> statement-breakpoint
ALTER TABLE `file_workflow_stage_progress` ADD `undoneAt` timestamp;--> statement-breakpoint
ALTER TABLE `file_workflow_stage_progress` ADD `undoneBy` int;