import type { StandShareClient } from "../auth/client.js";
import type { ToolResult } from "../types/index.js";
import { toolSuccess, toolError } from "../types/index.js";
import { formatDate, formatEntityRef, formatTable } from "../formatters/index.js";

interface WorkersInput {
  action: string;
  eventId?: string;
  userId?: string;
  familyId?: string;
  standId?: string;
  assignmentId?: string;
  attendanceStatus?: string;
  registrationStatus?: string;
  status?: string;
  rankByHistory?: boolean;
  dateFrom?: string;
  dateTo?: string;
  workerName?: string;
}

export async function handleWorkers(
  client: StandShareClient,
  input: WorkersInput
): Promise<ToolResult> {
  try {
    switch (input.action) {
      case "event_roster":
        return await eventRoster(client, input);
      case "assign":
        return await assign(client, input);
      case "update_assignment":
        return await updateAssignment(client, input);
      case "availability":
        return await availability(client, input);
      case "attendance_history":
        return await attendanceHistory(client, input);
      default:
        return toolError(
          `Unknown action: ${input.action}. Valid actions: event_roster, assign, update_assignment, availability, attendance_history`
        );
    }
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function eventRoster(client: StandShareClient, input: WorkersInput): Promise<ToolResult> {
  if (!input.eventId) return toolError("eventId is required for event_roster action");

  const data = await client.get<{
    data: Array<{
      assignmentId: string;
      userId: string;
      workerName: string;
      familyName: string;
      familyId: string;
      standNumber?: number;
      standId?: string;
      registrationStatus: string;
      attendanceStatus?: string | null;
    }>;
  }>(`/events/${input.eventId}/workers`, undefined);

  if (data.data.length === 0) {
    return toolSuccess("No workers assigned to this event.");
  }

  const rows = data.data.map((w) => ({
    Worker: formatEntityRef(w.workerName, w.userId),
    Family: formatEntityRef(w.familyName, w.familyId),
    Stand: w.standNumber != null ? `Stand ${w.standNumber}` : "-",
    Registration: w.registrationStatus,
    Attendance: w.attendanceStatus ?? "-",
  }));

  return toolSuccess(formatTable(rows));
}

async function assign(client: StandShareClient, input: WorkersInput): Promise<ToolResult> {
  if (!input.eventId) return toolError("eventId is required for assign action");
  if (!input.familyId) return toolError("familyId is required for assign action");

  const body: Record<string, unknown> = { familyId: input.familyId };
  if (input.userId) body.userId = input.userId;
  if (input.standId) body.standId = input.standId;
  if (input.workerName) body.workerName = input.workerName;

  const result = await client.post<{
    assignmentId: string;
    workerName: string;
    familyName: string;
    registrationStatus: string;
  }>(`/events/${input.eventId}/workers`, body);

  let text = `Assigned worker: **${result.workerName}** (${result.assignmentId})\n`;
  text += `- Family: ${result.familyName}\n`;
  text += `- Registration Status: ${result.registrationStatus}`;
  return toolSuccess(text);
}

async function updateAssignment(client: StandShareClient, input: WorkersInput): Promise<ToolResult> {
  if (!input.eventId) return toolError("eventId is required for update_assignment action");
  if (!input.assignmentId) return toolError("assignmentId is required for update_assignment action");

  const body: Record<string, unknown> = {};
  if (input.attendanceStatus) body.attendanceStatus = input.attendanceStatus;
  if (input.registrationStatus) body.registrationStatus = input.registrationStatus;
  if (input.standId) body.standId = input.standId;

  const result = await client.put<{
    assignmentId: string;
    workerName: string;
    attendanceStatus?: string;
    registrationStatus: string;
  }>(`/events/${input.eventId}/workers/${input.assignmentId}`, body);

  let text = `Updated assignment **${result.assignmentId}**`;
  if (result.workerName) text += ` for ${result.workerName}`;
  text += `\n`;
  text += `- Registration: ${result.registrationStatus}\n`;
  if (result.attendanceStatus) text += `- Attendance: ${result.attendanceStatus}`;
  return toolSuccess(text);
}

async function availability(client: StandShareClient, input: WorkersInput): Promise<ToolResult> {
  if (!input.eventId) return toolError("eventId is required for availability action");

  // Step 1: get already-assigned workers
  const rosterData = await client.get<{
    data: Array<{ userId: string; workerName: string }>;
  }>(`/events/${input.eventId}/workers`);

  const assignedUserIds = new Set(rosterData.data.map((w) => w.userId));

  // Step 2: get all active users
  const usersData = await client.get<{
    data: Array<{ id: string; name: string; status: string }>;
  }>("/admin/users", { limit: 100, status: "active" });

  // Step 3: filter out already-assigned users
  const available = usersData.data.filter((u) => !assignedUserIds.has(u.id));

  if (available.length === 0) {
    return toolSuccess("No available workers — all active users are already assigned to this event.");
  }

  const rows = available.map((u) => ({
    Worker: formatEntityRef(u.name, u.id),
    Status: u.status,
  }));

  return toolSuccess(formatTable(rows));
}

async function attendanceHistory(client: StandShareClient, input: WorkersInput): Promise<ToolResult> {
  if (!input.userId) return toolError("userId is required for attendance_history action");

  const params: Record<string, string | number | boolean | undefined> = {};
  if (input.dateFrom) params.startDate = input.dateFrom;
  if (input.dateTo) params.endDate = input.dateTo;

  const data = await client.get<{
    records: Array<{
      eventName: string;
      eventDate: string;
      attendanceStatus: string;
    }>;
  }>(`/admin/worker-performance/${input.userId}`, Object.keys(params).length > 0 ? params : undefined);

  const records = data.records;

  if (records.length === 0) {
    return toolSuccess("No attendance history found for this worker.");
  }

  const rows = records.map((r) => ({
    Event: r.eventName,
    Date: formatDate(r.eventDate),
    Status: r.attendanceStatus,
  }));

  const attended = records.filter((r) => r.attendanceStatus === "attended").length;
  const total = records.length;
  const rate = Math.round((attended / total) * 100);

  let text = formatTable(rows);
  text += `\n\nAttendance Rate: ${attended}/${total} = ${rate}%`;

  return toolSuccess(text);
}
