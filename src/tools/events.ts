import type { StandShareClient } from "../auth/client.js";
import type { ToolResult } from "../types/index.js";
import { toolSuccess, toolError } from "../types/index.js";
import { formatCurrency, formatDate, formatEntityRef, formatTable } from "../formatters/index.js";
import { formatPagination } from "../formatters/pagination.js";

interface EventsInput {
  action: string;
  eventId?: string;
  query?: string;
  venueId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  name?: string;
  date?: string;
  maxWorkers?: number;
  perPersonRate?: number;
  waitlistEnabled?: boolean;
  fundDistributionEnabled?: boolean;
  standNumber?: number;
  notes?: string;
  signupOpenAt?: string;
  signupCloseAt?: string;
}

export async function handleEvents(
  client: StandShareClient,
  input: EventsInput
): Promise<ToolResult> {
  try {
    switch (input.action) {
      case "search":
        return await searchEvents(client, input);
      case "get":
        return await getEvent(client, input);
      case "create":
        return await createEvent(client, input);
      case "update":
        return await updateEvent(client, input);
      case "add_stand":
        return await addStand(client, input);
      default:
        return toolError(`Unknown action: ${input.action}. Valid actions: search, get, create, update, add_stand`);
    }
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function searchEvents(client: StandShareClient, input: EventsInput): Promise<ToolResult> {
  const data = await client.get<{
    data: Array<{
      id: string;
      name: string;
      venue: string;
      date: string;
      status: string;
      maxWorkers: number;
    }>;
    pagination: { page: number; limit: number; total: number };
  }>("/events", {
    search: input.query,
    status: input.status,
    venueId: input.venueId,
    from: input.dateFrom,
    to: input.dateTo,
  });

  if (data.data.length === 0) {
    const filters = [input.query, input.status, input.dateFrom].filter(Boolean).join(", ");
    return toolSuccess(`No events found${filters ? ` matching: ${filters}` : ""}.`);
  }

  const rows = data.data.map((e) => ({
    Event: formatEntityRef(e.name, e.id),
    Venue: e.venue,
    Date: formatDate(e.date),
    Status: e.status,
    "Max Workers": String(e.maxWorkers),
  }));

  const table = formatTable(rows);
  const pagination = formatPagination(data.pagination);
  return toolSuccess(`${table}\n\n${pagination}`);
}

async function getEvent(client: StandShareClient, input: EventsInput): Promise<ToolResult> {
  if (!input.eventId) return toolError("eventId is required for get action");

  const event = await client.get<{
    id: string;
    name: string;
    venue: string;
    date: string;
    status: string;
    maxWorkers: number;
    perPersonRate?: number;
    waitlistEnabled: boolean;
    fundDistributionEnabled: boolean;
    notes?: string;
    stands?: Array<{ id: string; standNumber: number; maxWorkers: number }>;
  }>(`/events/${input.eventId}`);

  let text = `**${event.name}** (${event.id})\n`;
  text += `- Venue: ${event.venue}\n`;
  text += `- Date: ${formatDate(event.date)}\n`;
  text += `- Status: ${event.status}\n`;
  text += `- Max Workers: ${event.maxWorkers}\n`;
  if (event.perPersonRate !== undefined) {
    text += `- Per-Person Rate: ${formatCurrency(event.perPersonRate)}\n`;
  }
  text += `- Waitlist: ${event.waitlistEnabled ? "Enabled" : "Disabled"}\n`;
  text += `- Fund Distribution: ${event.fundDistributionEnabled ? "Enabled" : "Disabled"}\n`;
  if (event.notes) {
    text += `- Notes: ${event.notes}\n`;
  }

  if (event.stands && event.stands.length > 0) {
    text += `\n**Stands (${event.stands.length}):**\n`;
    const standRows = event.stands.map((s) => ({
      Stand: `Stand ${s.standNumber} (${s.id})`,
      "Max Workers": String(s.maxWorkers),
    }));
    text += formatTable(standRows);
  }

  return toolSuccess(text);
}

async function createEvent(client: StandShareClient, input: EventsInput): Promise<ToolResult> {
  if (!input.name) return toolError("name is required for create action");
  if (!input.date) return toolError("date is required for create action");

  const body: Record<string, unknown> = {
    name: input.name,
    date: input.date,
  };
  if (input.venueId) body.venueId = input.venueId;
  if (input.maxWorkers !== undefined) body.maxWorkers = input.maxWorkers;
  if (input.perPersonRate !== undefined) body.perPersonRate = input.perPersonRate;
  if (input.waitlistEnabled !== undefined) body.waitlistEnabled = input.waitlistEnabled;
  if (input.fundDistributionEnabled !== undefined) body.fundDistributionEnabled = input.fundDistributionEnabled;
  if (input.notes) body.notes = input.notes;
  if (input.signupOpenAt) body.signupOpenAt = input.signupOpenAt;
  if (input.signupCloseAt) body.signupCloseAt = input.signupCloseAt;

  const event = await client.post<{ id: string; name: string; date: string; status: string; venue?: string }>(
    "/events",
    body
  );

  let text = `Created event: **${event.name}** (${event.id})\n`;
  text += `- Date: ${formatDate(event.date)}\n`;
  text += `- Status: ${event.status}`;
  return toolSuccess(text);
}

async function updateEvent(client: StandShareClient, input: EventsInput): Promise<ToolResult> {
  if (!input.eventId) return toolError("eventId is required for update action");

  const body: Record<string, unknown> = {};
  if (input.name) body.name = input.name;
  if (input.date) body.date = input.date;
  if (input.maxWorkers !== undefined) body.maxWorkers = input.maxWorkers;
  if (input.perPersonRate !== undefined) body.perPersonRate = input.perPersonRate;
  if (input.waitlistEnabled !== undefined) body.waitlistEnabled = input.waitlistEnabled;
  if (input.fundDistributionEnabled !== undefined) body.fundDistributionEnabled = input.fundDistributionEnabled;
  if (input.notes) body.notes = input.notes;

  const event = await client.put<{ id: string; name: string }>(`/events/${input.eventId}`, body);

  return toolSuccess(`Updated event: **${event.name}** (${event.id})`);
}

async function addStand(client: StandShareClient, input: EventsInput): Promise<ToolResult> {
  if (!input.eventId) return toolError("eventId is required for add_stand action");
  if (input.standNumber === undefined) return toolError("standNumber is required for add_stand action");

  const body: Record<string, unknown> = {
    standNumber: input.standNumber,
  };
  if (input.maxWorkers !== undefined) body.maxWorkers = input.maxWorkers;

  const stand = await client.post<{ id: string; standNumber: number; maxWorkers: number }>(
    `/events/${input.eventId}/stands`,
    body
  );

  return toolSuccess(
    `Added Stand ${stand.standNumber} (${stand.id}) — max ${stand.maxWorkers} workers`
  );
}
