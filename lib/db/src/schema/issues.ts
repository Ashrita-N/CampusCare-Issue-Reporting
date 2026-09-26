import { createInsertSchema } from "drizzle-zod";
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const issuesTable = pgTable(
  "issues",
  {
    id: serial("id").primaryKey(),
    issueId: text("issue_id").notNull(),
    description: text("description").notNull(),
    shortDescription: text("short_description").notNull(),
    category: text("category").notNull(),
    aiCategory: text("ai_category").notNull(),
    priority: text("priority").notNull(),
    aiPriority: text("ai_priority").notNull(),
    priorityReason: text("priority_reason").notNull(),
    campus: text("campus").notNull(),
    block: text("block").notNull(),
    floor: text("floor").notNull(),
    room: text("room").notNull(),
    customLocation: text("custom_location"),
    imageUrl: text("image_url"),
    status: text("status").notNull().default("Reported"),
    assignedDepartment: text("assigned_department"),
    reportedBy: text("reported_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolutionNotes: text("resolution_notes"),
  },
  (table) => ({
    issueIdIdx: uniqueIndex("issues_issue_id_idx").on(table.issueId),
    statusIdx: uniqueIndex("issues_status_idx").on(table.status, table.id),
  }),
);

export const insertIssueSchema = createInsertSchema(issuesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
});
export type InsertIssue = z.infer<typeof insertIssueSchema>;
export type Issue = typeof issuesTable.$inferSelect;