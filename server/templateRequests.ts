import { and, desc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { templateRequests, users } from "../drizzle/schema";
import { sendEmailNotification } from "./_core/emailNotification";

export async function submitTemplateRequest(data: {
  requesterId: number;
  templateName: string;
  description?: string;
  justification: string;
  categoryId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(templateRequests).values({
    requesterId: data.requesterId,
    templateName: data.templateName,
    description: data.description || null,
    justification: data.justification,
    categoryId: data.categoryId || null,
    status: "pending",
  });

  const insertId = Number((result as any).insertId);

  // Notify admins about new request
  const requester = await db.select().from(users).where(eq(users.id, data.requesterId)).limit(1);
  if (requester.length > 0) {
    console.log(`[Template Request] New request from ${requester[0].name}: ${data.templateName}`);
    // Email notification would go here
  }

  return insertId;
}

export async function getTemplateRequests(filters?: {
  status?: "pending" | "approved" | "rejected";
  requesterId?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  let query = db
    .select({
      request: templateRequests,
      requester: users,
    })
    .from(templateRequests)
    .leftJoin(users, eq(templateRequests.requesterId, users.id))
    .orderBy(desc(templateRequests.createdAt));

  // Apply filters
  const conditions = [];
  if (filters?.status) {
    conditions.push(eq(templateRequests.status, filters.status));
  }
  if (filters?.requesterId) {
    conditions.push(eq(templateRequests.requesterId, filters.requesterId));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const results = await query;

  return results.map((row) => ({
    ...row.request,
    requesterName: row.requester?.name || "Unknown",
    requesterEmail: row.requester?.email || null,
  }));
}

export async function approveTemplateRequest(data: {
  requestId: number;
  adminId: number;
  adminComment?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(templateRequests)
    .set({
      status: "approved",
      adminId: data.adminId,
      adminComment: data.adminComment || null,
      updatedAt: new Date(),
    })
    .where(eq(templateRequests.id, data.requestId));

  // Get request details for notification
  const request = await db
    .select()
    .from(templateRequests)
    .where(eq(templateRequests.id, data.requestId))
    .limit(1);

  if (request.length > 0) {
    const requester = await db
      .select()
      .from(users)
      .where(eq(users.id, request[0].requesterId))
      .limit(1);

    if (requester.length > 0 && requester[0].email) {
      console.log(
        `[Template Request] Approved request #${data.requestId} - notifying ${requester[0].email}`
      );
      // Email notification would go here
    }
  }
}

export async function rejectTemplateRequest(data: {
  requestId: number;
  adminId: number;
  adminComment: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(templateRequests)
    .set({
      status: "rejected",
      adminId: data.adminId,
      adminComment: data.adminComment,
      updatedAt: new Date(),
    })
    .where(eq(templateRequests.id, data.requestId));

  // Get request details for notification
  const request = await db
    .select()
    .from(templateRequests)
    .where(eq(templateRequests.id, data.requestId))
    .limit(1);

  if (request.length > 0) {
    const requester = await db
      .select()
      .from(users)
      .where(eq(users.id, request[0].requesterId))
      .limit(1);

    if (requester.length > 0 && requester[0].email) {
      console.log(
        `[Template Request] Rejected request #${data.requestId} - notifying ${requester[0].email}`
      );
      // Email notification would go here
    }
  }
}
