import { Router, type IRouter } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  AnalyzeIssueBody,
  AnalyzeIssueResponse,
  CreateIssueBody,
  CreateIssueResponse,
  GetAnalyticsResponse,
  GetDashboardSummaryResponse,
  GetIssueHistoryParams,
  GetIssueHistoryResponse,
  GetIssueParams,
  GetIssueResponse,
  GetIssuesQueryParams,
  GetIssuesResponse,
  GetLocationsResponse,
  GetNotificationsResponse,
  MarkNotificationReadParams,
  MarkNotificationReadResponse,
  UpdateIssueBody,
  UpdateIssueParams,
  UpdateIssueResponse,
} from "@workspace/api-zod";
import {
  db,
  issuesTable,
  notificationsTable,
  statusHistoryTable,
} from "@workspace/db";
import {
  campusLocations,
  classifyDescription,
  ensureSeedData,
  getIssueByIssueId,
  getIssueRows,
  isSimilarIssue,
  locationLabel,
  notifyIssue,
  toIssueResponse,
} from "../lib/campus-care";

const router: IRouter = Router();
const demoUser = "Aarav Sharma";

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const rows = await getIssueRows();
  const [unread] = await db
    .select({ count: notificationsTable.id })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, 1), eq(notificationsTable.read, false)));
  const summary = {
    total: rows.length,
    reported: rows.filter((issue) => issue.status === "Reported").length,
    inProgress: rows.filter((issue) => issue.status === "In Progress").length,
    resolved: rows.filter((issue) => issue.status === "Resolved").length,
    critical: rows.filter((issue) => issue.priority === "Critical").length,
    unreadNotifications: unread?.count ?? 0,
    recentIssues: rows.filter((issue) => issue.reportedBy === demoUser).slice(0, 5).map(toIssueResponse),
  };
  res.json(GetDashboardSummaryResponse.parse(summary));
});

router.get("/issues", async (req, res): Promise<void> => {
  const parsed = GetIssuesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const query = parsed.data;
  let rows = await getIssueRows();
  const search = query.search?.toLowerCase();
  if (query.mine) rows = rows.filter((issue) => issue.reportedBy === demoUser);
  if (search) {
    rows = rows.filter((issue) =>
      [issue.issueId, issue.description, issue.category, issue.campus, issue.block, issue.room, issue.status]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }
  if (query.category) rows = rows.filter((issue) => issue.category === query.category);
  if (query.priority) rows = rows.filter((issue) => issue.priority === query.priority);
  if (query.status) rows = rows.filter((issue) => issue.status === query.status);
  if (query.department) rows = rows.filter((issue) => issue.assignedDepartment === query.department);
  if (query.location) rows = rows.filter((issue) => locationLabel(issue).toLowerCase().includes(query.location!.toLowerCase()));
  if (query.sort === "oldest") rows.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  if (query.sort === "highest_priority") {
    const weight: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    rows.sort((a, b) => (weight[b.priority] ?? 0) - (weight[a.priority] ?? 0));
  }
  if (query.sort === "recently_updated") rows.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  res.json(GetIssuesResponse.parse(rows.map(toIssueResponse)));
});

router.post("/issues/analyze", async (req, res): Promise<void> => {
  const parsed = AnalyzeIssueBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  res.json(AnalyzeIssueResponse.parse(classifyDescription(parsed.data.description)));
});

router.post("/issues", async (req, res): Promise<void> => {
  const parsed = CreateIssueBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const analysis = classifyDescription(data.description);
  const existing = await getIssueRows();
  const similar = existing
    .filter((issue) =>
      isSimilarIssue(
        {
          description: data.description,
          campus: data.campus,
          block: data.block,
          floor: data.floor,
          room: data.room,
          category: data.category ?? analysis.category,
        },
        issue,
      ),
    )
    .slice(0, 3);
  const issueId = `CAM-${1043 + existing.length}`;
  const [created] = await db
    .insert(issuesTable)
    .values({
      issueId,
      description: data.description,
      shortDescription: data.description.split(/[.!?]/)[0].trim().slice(0, 96),
      category: data.category && data.category !== "Auto-detect" ? data.category : analysis.category,
      aiCategory: analysis.category,
      priority: analysis.priority,
      aiPriority: analysis.priority,
      priorityReason: analysis.priorityReason,
      campus: data.campus,
      block: data.block,
      floor: data.floor,
      room: data.room,
      customLocation: data.customLocation ?? null,
      imageUrl: data.imageUrl ?? null,
      status: "Reported",
      assignedDepartment: null,
      reportedBy: data.reportedBy,
      resolutionNotes: null,
    })
    .returning();
  await db.insert(statusHistoryTable).values({
    issueId,
    previousStatus: null,
    newStatus: "Reported",
    changedBy: data.reportedBy,
    note: "Issue submitted",
  });
  const response = {
    issue: toIssueResponse(created),
    similarIssues: similar.map(toIssueResponse),
  };
  res.status(201).json(CreateIssueResponse.parse(response));
});

router.get("/issues/:issueId", async (req, res): Promise<void> => {
  const parsed = GetIssueParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await ensureSeedData();
  const issue = await getIssueByIssueId(parsed.data.issueId);
  if (!issue) {
    res.status(404).json({ error: "Issue not found" });
    return;
  }
  res.json(GetIssueResponse.parse(toIssueResponse(issue)));
});

router.patch("/issues/:issueId", async (req, res): Promise<void> => {
  const params = GetIssueParams.safeParse(req.params);
  const body = UpdateIssueBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  await ensureSeedData();
  const issue = await getIssueByIssueId(params.data.issueId);
  if (!issue) {
    res.status(404).json({ error: "Issue not found" });
    return;
  }
  const update = body.data;
  const values: Partial<typeof issuesTable.$inferInsert> = { updatedAt: new Date() };
  if (update.status !== undefined) values.status = update.status;
  if (update.priority !== undefined) values.priority = update.priority;
  if (update.category !== undefined) values.category = update.category;
  if (update.assignedDepartment !== undefined) values.assignedDepartment = update.assignedDepartment;
  if (update.resolutionNotes !== undefined) values.resolutionNotes = update.resolutionNotes;
  if (update.status === "Resolved") values.resolvedAt = new Date();
  const [updated] = await db.update(issuesTable).set(values).where(eq(issuesTable.issueId, issue.issueId)).returning();
  if (update.status && update.status !== issue.status) {
    await db.insert(statusHistoryTable).values({
      issueId: issue.issueId,
      previousStatus: issue.status,
      newStatus: update.status,
      changedBy: "CampusCare Admin",
      note: update.note ?? null,
    });
    await notifyIssue(
      issue.issueId,
      update.status === "Resolved"
        ? `Your issue ${issue.issueId} has been resolved.`
        : `Your issue ${issue.issueId} is now ${update.status}.`,
    );
  }
  res.json(UpdateIssueResponse.parse(toIssueResponse(updated)));
});

router.get("/issues/:issueId/history", async (req, res): Promise<void> => {
  const parsed = GetIssueHistoryParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await ensureSeedData();
  const rows = await db
    .select()
    .from(statusHistoryTable)
    .where(eq(statusHistoryTable.issueId, parsed.data.issueId))
    .orderBy(asc(statusHistoryTable.timestamp));
  res.json(
    GetIssueHistoryResponse.parse(
      rows.map((row) => ({
        id: row.id,
        issueId: row.issueId,
        previousStatus: row.previousStatus,
        newStatus: row.newStatus,
        changedBy: row.changedBy,
        timestamp: row.timestamp.toISOString(),
        note: row.note,
      })),
    ),
  );
});

router.get("/notifications", async (_req, res): Promise<void> => {
  await ensureSeedData();
  const rows = await db.select().from(notificationsTable).orderBy(desc(notificationsTable.createdAt));
  res.json(
    GetNotificationsResponse.parse(
      rows.map((row) => ({
        id: row.id,
        issueId: row.issueId,
        message: row.message,
        read: row.read,
        createdAt: row.createdAt.toISOString(),
      })),
    ),
  );
});

router.patch("/notifications/:notificationId/read", async (req, res): Promise<void> => {
  const parsed = MarkNotificationReadParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(notificationsTable)
    .set({ read: true })
    .where(eq(notificationsTable.id, parsed.data.notificationId))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }
  res.json(
    MarkNotificationReadResponse.parse({
      id: updated.id,
      issueId: updated.issueId,
      message: updated.message,
      read: updated.read,
      createdAt: updated.createdAt.toISOString(),
    }),
  );
});

router.get("/analytics", async (_req, res): Promise<void> => {
  const rows = await getIssueRows();
  const metric = (values: string[]) =>
    [...new Set(values)].map((label) => ({ label, value: values.filter((value) => value === label).length })).sort((a, b) => b.value - a.value);
  const byStatus = metric(rows.map((issue) => issue.status));
  const byPriority = metric(rows.map((issue) => issue.priority));
  const byCategory = metric(rows.map((issue) => issue.category));
  const byLocation = metric(rows.map((issue) => issue.block));
  const resolutionTrend = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (5 - index));
    const label = date.toLocaleDateString("en-US", { weekday: "short" });
    return { label, value: rows.filter((issue) => issue.resolvedAt && issue.resolvedAt.toDateString() === date.toDateString()).length };
  });
  const topCategory = byCategory[0]?.label ?? "No category";
  const topLocation = byLocation[0]?.label ?? "No location";
  const insights = [
    `Most reported issue category this month: ${topCategory}`,
    `${topLocation} currently has the highest number of reported issues.`,
    `${rows.filter((issue) => issue.status !== "Resolved").length} issues are still open across campus.`,
  ];
  res.json(GetAnalyticsResponse.parse({ byStatus, byPriority, byCategory, byLocation, resolutionTrend, insights }));
});

router.get("/metadata/locations", async (_req, res): Promise<void> => {
  res.json(GetLocationsResponse.parse(campusLocations));
});

export default router;