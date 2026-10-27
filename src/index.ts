#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from "dotenv";
import { resolveAuth } from "./auth/resolve.js";
import { StandShareClient } from "./auth/client.js";
import { handleEvents } from "./tools/events.js";
import { handleFamilies } from "./tools/families.js";
import { handleUsers } from "./tools/users.js";
import { handleVenues } from "./tools/venues.js";
import { handleFinances } from "./tools/finances.js";
import { handleWorkers } from "./tools/workers.js";
import { handleNotifications } from "./tools/notifications.js";
import { handleReports } from "./tools/reports.js";
import { FINANCES_ACTIONS, NOTIFICATIONS_ACTIONS } from "./tools/schemas.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

dotenv.config();

const { auth, apiUrl, tenantSlug } = resolveAuth(process.env);
const client = new StandShareClient(apiUrl, tenantSlug, auth);

const server = new McpServer({
  name: "standshare-mcp",
  version: "1.0.1",
  description:
    "StandShare API tools for managing events, families, users, venues, finances, workers, notifications, and reports. StandShare is a family fundraising platform where organizations manage concession stand events, assign workers, track attendance, and distribute earnings to family accounts.",
});

// --- Events Tool ---
server.tool(
  "events",
  "Manage fundraising events — search, view details, create, update, and add stands. Events are concession stand shifts at venues where families send workers to earn commissions.",
  {
    action: z.enum(["search", "get", "create", "update", "add_stand"]).describe("Action to perform"),
    eventId: z.string().optional().describe("Event ID (required for get, update, add_stand)"),
    query: z.string().optional().describe("Search by event name"),
    venueId: z.string().optional().describe("Filter by venue ID"),
    dateFrom: z.string().optional().describe("Filter events from this date (ISO 8601)"),
    dateTo: z.string().optional().describe("Filter events to this date (ISO 8601)"),
    status: z.enum(["upcoming", "active", "completed", "settled"]).optional().describe("Filter by status"),
    name: z.string().optional().describe("Event name (for create)"),
    date: z.string().optional().describe("Event date ISO 8601 (for create)"),
    maxWorkers: z.number().optional().describe("Maximum workers for the event"),
    perPersonRate: z.number().optional().describe("Per-person rate in dollars"),
    waitlistEnabled: z.boolean().optional().describe("Enable waitlist"),
    fundDistributionEnabled: z.boolean().optional().describe("Enable fund distribution"),
    standNumber: z.number().optional().describe("Stand number (for add_stand)"),
    notes: z.string().optional().describe("Event notes"),
    signupOpenAt: z.string().optional().describe("Signup open date ISO 8601"),
    signupCloseAt: z.string().optional().describe("Signup close date ISO 8601"),
  },
  async (input) => handleEvents(client, input)
);

// --- Families Tool ---
server.tool(
  "families",
  "Manage family units — search, view details with balance, create, and add members. Families are the core unit in StandShare — they send workers to events and earn commissions to their family account.",
  {
    action: z.enum(["search", "get", "create", "add_member"]).describe("Action to perform"),
    familyId: z.string().optional().describe("Family ID (required for get, add_member)"),
    query: z.string().optional().describe("Search by family name"),
    program: z.string().optional().describe("Filter by program (e.g., Varsity, JV)"),
    status: z.string().optional().describe("Filter by status"),
    familyName: z.string().optional().describe("Family name (for create)"),
    primaryContactUserId: z.string().optional().describe("Primary contact user ID (for create)"),
    userId: z.string().optional().describe("User ID to add as member"),
    role: z.string().optional().describe("Member role (lead, worker)"),
  },
  async (input) => handleFamilies(client, input)
);

// --- Users Tool ---
server.tool(
  "users",
  "Manage user accounts — search, view details with roles and family associations, create, and invite. Users are individuals who log into StandShare and may be associated with one or more families.",
  {
    action: z.enum(["search", "get", "create", "invite"]).describe("Action to perform"),
    userId: z.string().optional().describe("User ID (required for get)"),
    query: z.string().optional().describe("Search by name or email"),
    role: z.string().optional().describe("Filter by role name"),
    status: z.string().optional().describe("Filter by status"),
    email: z.string().optional().describe("Email address (required for create, invite)"),
    firstName: z.string().optional().describe("First name"),
    lastName: z.string().optional().describe("Last name"),
    phone: z.string().optional().describe("Phone number"),
  },
  async (input) => handleUsers(client, input)
);

// --- Venues Tool ---
server.tool(
  "venues",
  "Look up venues — search by name/location and view details. Venues are physical locations (stadiums, arenas) where fundraising events take place.",
  {
    action: z.enum(["search", "get"]).describe("Action to perform"),
    venueId: z.string().optional().describe("Venue ID (required for get)"),
    query: z.string().optional().describe("Search by venue name"),
    city: z.string().optional().describe("Filter by city"),
    state: z.string().optional().describe("Filter by state"),
  },
  async (input) => handleVenues(client, input)
);

// --- Finances Tool ---
server.tool(
  "finances",
  "Read-only financial views: family balances, event revenue, transactions and settlement templates. Settlement, account credits and scholarships are recorded in the StandShare web app.",
  {
    action: z.enum(FINANCES_ACTIONS).describe("Action to perform"),
    familyId: z.string().optional().describe("Family ID"),
    eventId: z.string().optional().describe("Event ID"),
    venueId: z.string().optional().describe("Venue ID for revenue filtering"),
    dateFrom: z.string().optional().describe("Start date (ISO 8601)"),
    dateTo: z.string().optional().describe("End date (ISO 8601)"),
    type: z.string().optional().describe("Transaction type filter (event_commission, fund_deduction, scholarship_payment)"),
    limit: z.number().optional().describe("Number of transactions to return"),
    templateId: z.string().optional().describe("Template ID (for get_settlement_template)"),
  },
  async (input) => handleFinances(client, input)
);

// --- Workers Tool ---
server.tool(
  "workers",
  "Manage worker assignments — view event rosters, assign workers to events/stands, update attendance, check availability, and view attendance history. Workers are family members who work concession stands at events.",
  {
    action: z.enum(["event_roster", "assign", "update_assignment", "availability", "attendance_history"]).describe("Action to perform"),
    eventId: z.string().optional().describe("Event ID (required for event_roster, assign, update_assignment, availability)"),
    userId: z.string().optional().describe("User ID"),
    familyId: z.string().optional().describe("Family ID (required for assign)"),
    standId: z.string().optional().describe("Stand ID to assign worker to"),
    assignmentId: z.string().optional().describe("Assignment ID (required for update_assignment)"),
    attendanceStatus: z.enum(["assigned", "confirmed", "attended", "no_show", "cancelled"]).optional().describe("Attendance status"),
    registrationStatus: z.enum(["confirmed", "waitlisted", "cancelled_by_family", "declined"]).optional().describe("Registration status"),
    rankByHistory: z.boolean().optional().describe("Rank available workers by attendance history"),
    dateFrom: z.string().optional().describe("Start date for history (ISO 8601)"),
    dateTo: z.string().optional().describe("End date for history (ISO 8601)"),
    workerName: z.string().optional().describe("Worker name (for assign)"),
  },
  async (input) => handleWorkers(client, input)
);

// --- Notifications Tool ---
server.tool(
  "notifications",
  "Send and view notifications — send messages to individual users and list notifications.",
  {
    action: z.enum(NOTIFICATIONS_ACTIONS).describe("Action to perform"),
    userId: z.string().optional().describe("User ID (required for send)"),
    title: z.string().optional().describe("Notification title"),
    message: z.string().optional().describe("Notification body"),
    unreadOnly: z.boolean().optional().describe("Only show unread notifications"),
  },
  async (input) => handleNotifications(client, input)
);

// --- Reports Tool ---
server.tool(
  "reports",
  "View organizational reports — admin dashboard with KPIs, financial summaries for date ranges, and compliance status showing which families are missing required documents.",
  {
    action: z.enum(["dashboard", "financial_summary", "compliance_status"]).describe("Action to perform"),
    dateFrom: z.string().optional().describe("Start date for financial_summary (ISO 8601)"),
    dateTo: z.string().optional().describe("End date for financial_summary (ISO 8601)"),
    familyId: z.string().optional().describe("Family ID for compliance_status"),
  },
  async (input) => handleReports(client, input)
);

// --- Domain Guide Resource ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const guideContent = readFileSync(join(__dirname, "resources", "guide.md"), "utf-8");

server.resource(
  "guide",
  "standshare://guide",
  async (uri) => ({
    contents: [{
      uri: uri.href,
      mimeType: "text/markdown",
      text: guideContent,
    }],
  })
);

// --- Start Server ---
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
