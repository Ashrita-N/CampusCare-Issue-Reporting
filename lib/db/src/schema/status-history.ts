import { createInsertSchema } from "drizzle-zod";
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const statusHistoryTable = pgTable("status_history", {
  id: serial("id").primaryKey(),
  issueId: text("issue_id").notNull(),
  previousStatus: text("previous_status"),
  newStatus: text("new_status").notNull(),
  changedBy: text("changed_by").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  note: text("note"),
});

export const insertStatusHistorySchema = createInsertSchema(statusHistoryTable).omit({
  id: true,
  timestamp: true,
});
export type InsertStatusHistory = z.infer<typeof insertStatusHistorySchema>;
export type StatusHistory = typeof statusHistoryTable.$inferSelect;