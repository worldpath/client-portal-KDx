import { getDb } from "./db";
import { fileWorkflowInstances, fileWorkflowStageProgress, workflowStages, workflowTemplates, users } from "../drizzle/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

export interface WorkflowAnalytics {
  averageApprovalTimes: Array<{
    templateName: string;
    stageName: string;
    averageDays: number;
    stageOrder: number;
  }>;
  reviewerWorkload: Array<{
    reviewerId: number;
    reviewerName: string;
    pendingCount: number;
    completedCount: number;
    averageResponseDays: number;
  }>;
  bottlenecks: Array<{
    templateName: string;
    stageName: string;
    pendingCount: number;
    averagePendingDays: number;
  }>;
  completionRates: Array<{
    templateName: string;
    totalStarted: number;
    totalCompleted: number;
    completionRate: number;
  }>;
}

/**
 * Get comprehensive workflow analytics
 */
export async function getWorkflowAnalytics(): Promise<WorkflowAnalytics> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Calculate average approval times per stage
  const approvalTimes = await db
    .select({
      templateName: workflowTemplates.name,
      stageName: workflowStages.stageName,
      stageOrder: workflowStages.stageOrder,
      averageDays: sql<number>`AVG(DATEDIFF(${fileWorkflowStageProgress.completedAt}, ${fileWorkflowStageProgress.startedAt}))`.as('averageDays'),
    })
    .from(fileWorkflowStageProgress)
    .innerJoin(workflowStages, eq(fileWorkflowStageProgress.stageId, workflowStages.id))
    .innerJoin(fileWorkflowInstances, eq(fileWorkflowStageProgress.workflowInstanceId, fileWorkflowInstances.id))
    .innerJoin(workflowTemplates, eq(fileWorkflowInstances.workflowTemplateId, workflowTemplates.id))
    .where(eq(fileWorkflowStageProgress.status, 'approved'))
    .groupBy(workflowTemplates.id, workflowStages.id)
    .orderBy(workflowTemplates.name, workflowStages.stageOrder);

  // Calculate reviewer workload
  const reviewerStats = await db
    .select({
      reviewerId: users.id,
      reviewerName: users.name,
      pendingCount: sql<number>`SUM(CASE WHEN ${fileWorkflowStageProgress.status} = 'pending' THEN 1 ELSE 0 END)`.as('pendingCount'),
      completedCount: sql<number>`SUM(CASE WHEN ${fileWorkflowStageProgress.status} = 'approved' THEN 1 ELSE 0 END)`.as('completedCount'),
      averageResponseDays: sql<number>`AVG(CASE WHEN ${fileWorkflowStageProgress.status} = 'approved' THEN DATEDIFF(${fileWorkflowStageProgress.completedAt}, ${fileWorkflowStageProgress.startedAt}) END)`.as('averageResponseDays'),
    })
    .from(fileWorkflowStageProgress)
    .innerJoin(workflowStages, eq(fileWorkflowStageProgress.stageId, workflowStages.id))
    .innerJoin(users, sql`FIND_IN_SET(${users.id}, ${fileWorkflowStageProgress.assignedReviewers})`)
    .groupBy(users.id)
    .orderBy(sql`pendingCount DESC`);

  // Identify bottlenecks (stages with many pending items and long average wait times)
  const bottlenecks = await db
    .select({
      templateName: workflowTemplates.name,
      stageName: workflowStages.stageName,
      pendingCount: sql<number>`COUNT(*)`.as('pendingCount'),
      averagePendingDays: sql<number>`AVG(DATEDIFF(NOW(), ${fileWorkflowStageProgress.startedAt}))`.as('averagePendingDays'),
    })
    .from(fileWorkflowStageProgress)
    .innerJoin(workflowStages, eq(fileWorkflowStageProgress.stageId, workflowStages.id))
    .innerJoin(fileWorkflowInstances, eq(fileWorkflowStageProgress.workflowInstanceId, fileWorkflowInstances.id))
    .innerJoin(workflowTemplates, eq(fileWorkflowInstances.workflowTemplateId, workflowTemplates.id))
    .where(eq(fileWorkflowStageProgress.status, 'pending'))
    .groupBy(workflowTemplates.id, workflowStages.id)
    .having(sql`COUNT(*) > 0`)
    .orderBy(sql`averagePendingDays DESC`)
    .limit(10);

  // Calculate completion rates
  const completionRates = await db
    .select({
      templateName: workflowTemplates.name,
      totalStarted: sql<number>`COUNT(DISTINCT ${fileWorkflowInstances.id})`.as('totalStarted'),
      totalCompleted: sql<number>`SUM(CASE WHEN ${fileWorkflowInstances.status} = 'completed' THEN 1 ELSE 0 END)`.as('totalCompleted'),
    })
    .from(fileWorkflowInstances)
    .innerJoin(workflowTemplates, eq(fileWorkflowInstances.workflowTemplateId, workflowTemplates.id))
    .groupBy(workflowTemplates.id);

  const completionRatesWithPercentage = completionRates.map(rate => ({
    ...rate,
    completionRate: rate.totalStarted > 0 ? (rate.totalCompleted / rate.totalStarted) * 100 : 0,
  }));

  return {
    averageApprovalTimes: approvalTimes.map(t => ({
      templateName: t.templateName,
      stageName: t.stageName,
      stageOrder: t.stageOrder,
      averageDays: Number(t.averageDays) || 0,
    })),
    reviewerWorkload: reviewerStats.map(r => ({
      reviewerId: r.reviewerId,
      reviewerName: r.reviewerName || 'Unknown',
      pendingCount: Number(r.pendingCount) || 0,
      completedCount: Number(r.completedCount) || 0,
      averageResponseDays: Number(r.averageResponseDays) || 0,
    })),
    bottlenecks: bottlenecks.map(b => ({
      templateName: b.templateName,
      stageName: b.stageName,
      pendingCount: Number(b.pendingCount) || 0,
      averagePendingDays: Number(b.averagePendingDays) || 0,
    })),
    completionRates: completionRatesWithPercentage,
  };
}
