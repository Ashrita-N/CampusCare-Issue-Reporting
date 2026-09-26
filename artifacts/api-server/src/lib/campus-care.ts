import { desc, eq } from "drizzle-orm";
import { db, issuesTable, notificationsTable, statusHistoryTable } from "@workspace/db";

export const categoryOptions = [
  "Electrical",
  "Plumbing",
  "Internet/Wi-Fi",
  "Furniture",
  "Sanitation",
  "Security",
  "Classroom",
  "Laboratory",
  "Transport",
  "Infrastructure",
  "Other",
] as const;

export const departmentOptions = [
  "Electrical",
  "Plumbing",
  "IT Support",
  "Maintenance",
  "Security",
  "Housekeeping",
  "Administration",
] as const;

export const campusLocations = [
  {
    campus: "North Campus",
    blocks: [
      { name: "Ramanujacharya block", floors: ["UG", "G", "1", "2", "3"] },
      { name: "Shankaracharya block", floors: ["G", "1", "2", "3"] },
      { name: "Madhvacharya block", floors: ["G"] },
      { name: "Girls hostel", floors: ["G", "1", "2", "3", "4"] },
      { name: "Boys hostel", floors: ["G", "1", "2", "3", "4", "5"] },
    ],
  },
  {
    campus: "South Campus",
    blocks: [
      { name: "Administrative block", floors: ["G", "1", "2"] },
      { name: "Golden Jubilee block", floors: ["UG", "G", "1", "2", "3"] },
      { name: "Diamond Jubilee complex", floors: ["G", "1", "2"] },
      { name: "Girls hostel", floors: ["G", "1", "2", "3"] },
      { name: "Boys hostel", floors: ["G", "1", "2", "3", "4"] },
    ],
  },
] as const;

const seedIssues = [
  {
    issueId: "CAM-1042",
    description:
      "Water is leaking from the ceiling in the third floor corridor and the floor is getting flooded.",
    shortDescription: "Water leak in third floor corridor",
    category: "Plumbing",
    aiCategory: "Plumbing",
    priority: "High",
    aiPriority: "High",
    priorityReason: "Water leakage may cause property damage and create a safety hazard.",
    campus: "North Campus",
    block: "Ramanujacharya block",
    floor: "3",
    room: "Corridor",
    customLocation: null,
    status: "In Progress",
    assignedDepartment: "Plumbing",
    reportedBy: "Aarav Sharma",
    resolutionNotes: null,
  },
  {
    issueId: "CAM-1041",
    description: "The projector in lecture room 204 is not turning on before class.",
    shortDescription: "Projector not working in lecture room 204",
    category: "Classroom",
    aiCategory: "Classroom",
    priority: "Medium",
    aiPriority: "Medium",
    priorityReason: "This affects teaching continuity but does not create an immediate safety risk.",
    campus: "North Campus",
    block: "Shankaracharya block",
    floor: "2",
    room: "204",
    customLocation: null,
    status: "Reported",
    assignedDepartment: "Maintenance",
    reportedBy: "Aarav Sharma",
    resolutionNotes: null,
  },
  {
    issueId: "CAM-1039",
    description: "Wi-Fi keeps disconnecting in the computer lab during practical sessions.",
    shortDescription: "Wi-Fi drops in computer lab",
    category: "Internet/Wi-Fi",
    aiCategory: "Internet/Wi-Fi",
    priority: "Medium",
    aiPriority: "Medium",
    priorityReason: "An unstable connection is disrupting lab work and student access.",
    campus: "South Campus",
    block: "Golden Jubilee block",
    floor: "1",
    room: "Computer Lab",
    customLocation: null,
    status: "Resolved",
    assignedDepartment: "IT Support",
    reportedBy: "Maya Nair",
    resolutionNotes: "Access point firmware was updated and the lab network was rebalanced.",
  },
  {
    issueId: "CAM-1038",
    description: "A chair has a loose leg in the reading room.",
    shortDescription: "Loose chair in reading room",
    category: "Furniture",
    aiCategory: "Furniture",
    priority: "Low",
    aiPriority: "Low",
    priorityReason: "This is a minor maintenance issue with a simple replacement path.",
    campus: "North Campus",
    block: "Ramanujacharya block",
    floor: "1",
    room: "Reading room",
    customLocation: null,
    status: "Resolved",
    assignedDepartment: "Maintenance",
    reportedBy: "Aarav Sharma",
    resolutionNotes: "Chair replaced.",
  },
  {
    issueId: "CAM-1036",
    description: "Exposed electrical wires are visible beside the lab entrance.",
    shortDescription: "Exposed wires near lab entrance",
    category: "Electrical",
    aiCategory: "Electrical",
    priority: "Critical",
    aiPriority: "Critical",
    priorityReason: "Exposed electrical wiring is an immediate safety hazard.",
    campus: "South Campus",
    block: "Administrative block",
    floor: "G",
    room: "Lab entrance",
    customLocation: null,
    status: "In Progress",
    assignedDepartment: "Electrical",
    reportedBy: "Maya Nair",
    resolutionNotes: null,
  },
  {
    issueId: "CAM-1034",
    description: "The washroom near the hostel dining hall needs cleaning and supplies.",
    shortDescription: "Washroom supplies need restocking",
    category: "Sanitation",
    aiCategory: "Sanitation",
    priority: "Low",
    aiPriority: "Low",
    priorityReason: "This is a routine facilities issue without an immediate safety risk.",
    campus: "North Campus",
    block: "Girls hostel",
    floor: "2",
    room: "Washroom",
    customLocation: null,
    status: "Reported",
    assignedDepartment: "Housekeeping",
    reportedBy: "Aarav Sharma",
    resolutionNotes: null,
  },
] as const;

export function classifyDescription(description: string) {
  const value = description.toLowerCase();
  const category =
    /(water|leak|pipe|tap|bathroom|washroom|flood)/.test(value)
      ? "Plumbing"
      : /(wifi|wi-fi|internet|network|disconnect|router)/.test(value)
        ? "Internet/Wi-Fi"
        : /(fan|light|wire|power|electric|socket|switch|voltage)/.test(value)
          ? "Electrical"
          : /(chair|desk|table|bench|furniture)/.test(value)
            ? "Furniture"
            : /(clean|garbage|waste|sanitation|toilet|supplies)/.test(value)
              ? "Sanitation"
              : /(camera|security|theft|unsafe|guard|ragging|harass)/.test(value)
                ? "Security"
                : /(projector|classroom|lecture|board)/.test(value)
                  ? "Classroom"
                  : /(lab|laboratory|equipment)/.test(value)
                    ? "Laboratory"
                    : /(bus|transport|shuttle)/.test(value)
                      ? "Transport"
                      : /(road|wall|building|ceiling|door|window|floor)/.test(value)
                        ? "Infrastructure"
                        : "Other";

  const priority =
    /(fire|gas leak|exposed wire|electric shock|major flood|ragging|weapon|break-in)/.test(value)
      ? "Critical"
      : /(large leak|water leak|flood|power failure|broken security|unsafe)/.test(value)
        ? "High"
        : /(wifi|wi-fi|internet|fan|projector|classroom|disconnect)/.test(value)
          ? "Medium"
          : "Low";

  const priorityReason =
    priority === "Critical"
      ? "This description suggests an immediate safety or security risk that needs urgent attention."
      : priority === "High"
        ? "This issue may cause property damage or create a safety hazard if left unattended."
        : priority === "Medium"
          ? "This issue is important and may disrupt learning or campus services."
          : "This appears to be a minor facilities issue with a straightforward maintenance path.";

  return { category, priority, priorityReason, confidence: category === "Other" ? 0.61 : 0.94 };
}

export function locationLabel(issue: {
  campus: string;
  block: string;
  floor: string;
  room: string;
  customLocation?: string | null;
}) {
  return issue.customLocation
    ? `${issue.campus} · ${issue.block} · ${issue.customLocation}`
    : `${issue.campus} · ${issue.block} · Floor ${issue.floor} · ${issue.room}`;
}

export function toIssueResponse(issue: typeof issuesTable.$inferSelect) {
  return {
    id: issue.id,
    issueId: issue.issueId,
    description: issue.description,
    shortDescription: issue.shortDescription,
    category: issue.category,
    aiCategory: issue.aiCategory,
    priority: issue.priority,
    aiPriority: issue.aiPriority,
    priorityReason: issue.priorityReason,
    status: issue.status,
    campus: issue.campus,
    block: issue.block,
    floor: issue.floor,
    room: issue.room,
    locationLabel: locationLabel(issue),
    imageUrl: issue.imageUrl,
    assignedDepartment: issue.assignedDepartment,
    reportedBy: issue.reportedBy,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
    resolvedAt: issue.resolvedAt?.toISOString() ?? null,
    resolutionNotes: issue.resolutionNotes,
    duplicateOf: null,
  };
}

export async function ensureSeedData() {
  const existing = await db.select({ id: issuesTable.id }).from(issuesTable).limit(1);
  if (existing.length > 0) return;
  const created = await db
    .insert(issuesTable)
    .values(seedIssues.map((issue) => ({ ...issue, imageUrl: null })))
    .returning();
  await db.insert(statusHistoryTable).values(
    created.flatMap((issue) => {
      const now = issue.createdAt;
      const history: Array<{
        issueId: string;
        previousStatus: string | null;
        newStatus: string;
        changedBy: string;
        timestamp: Date;
        note: string;
      }> = [{ issueId: issue.issueId, previousStatus: null, newStatus: "Reported", changedBy: issue.reportedBy, timestamp: now, note: "Issue submitted" }];
      if (issue.status !== "Reported") {
        history.push({ issueId: issue.issueId, previousStatus: "Reported", newStatus: issue.status, changedBy: "CampusCare Admin", timestamp: issue.updatedAt, note: issue.status === "Resolved" ? "Resolution confirmed" : "Assigned to department" });
      }
      return history;
    }),
  );
  await db.insert(notificationsTable).values([
    { userId: 1, issueId: "CAM-1042", message: "Your issue CAM-1042 is now In Progress.", read: false },
    { userId: 1, issueId: "CAM-1038", message: "Your issue CAM-1038 has been resolved.", read: false },
    { userId: 1, issueId: "CAM-1041", message: "A similar classroom issue was reported nearby.", read: true },
  ]);
}

export async function getIssueRows() {
  await ensureSeedData();
  return db.select().from(issuesTable).orderBy(desc(issuesTable.updatedAt));
}

export function isSimilarIssue(
  candidate: { description: string; campus: string; block: string; floor: string; room: string; category: string },
  issue: typeof issuesTable.$inferSelect,
) {
  const sameLocation =
    candidate.campus === issue.campus &&
    candidate.block === issue.block &&
    candidate.floor === issue.floor &&
    candidate.room.toLowerCase() === issue.room.toLowerCase();
  const words = candidate.description
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 4);
  const sharedWords = words.filter((word) => issue.description.toLowerCase().includes(word)).length;
  return sameLocation || (candidate.category === issue.category && sharedWords >= 2);
}

export async function notifyIssue(issueId: string, message: string) {
  await db.insert(notificationsTable).values({ userId: 1, issueId, message, read: false });
}

export async function getIssueByIssueId(issueId: string) {
  const [issue] = await db.select().from(issuesTable).where(eq(issuesTable.issueId, issueId));
  return issue;
}