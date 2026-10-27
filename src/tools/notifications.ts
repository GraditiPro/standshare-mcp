import type { StandShareClient } from "../auth/client.js";
import type { ToolResult } from "../types/index.js";
import { toolSuccess, toolError } from "../types/index.js";
import { formatDate, formatTable } from "../formatters/index.js";

interface NotificationsInput {
  action: string;
  userId?: string;
  title?: string;
  message?: string;
  unreadOnly?: boolean;
}

export async function handleNotifications(
  client: StandShareClient,
  input: NotificationsInput
): Promise<ToolResult> {
  try {
    switch (input.action) {
      case "list":
        return await listNotifications(client, input);
      case "send":
        return await sendNotification(client, input);
      default:
        return toolError(`Unknown action: ${input.action}. Valid actions: list, send`);
    }
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function listNotifications(
  client: StandShareClient,
  input: NotificationsInput
): Promise<ToolResult> {
  const params: Record<string, string | number | boolean | undefined> = {};
  if (input.unreadOnly !== undefined) params.unreadOnly = input.unreadOnly;

  const data = await client.get<
    Array<{
      id: string;
      title: string;
      message: string;
      read: boolean;
      createdAt: string;
    }>
  >("/my/notifications", params);

  if (data.length === 0) {
    return toolSuccess("No notifications found.");
  }

  const rows = data.map((n) => ({
    Status: n.read ? "Read" : "Unread",
    Title: n.title,
    Message: n.message.length > 60 ? n.message.slice(0, 60) + "..." : n.message,
    Date: formatDate(n.createdAt),
  }));

  return toolSuccess(formatTable(rows));
}

async function sendNotification(
  client: StandShareClient,
  input: NotificationsInput
): Promise<ToolResult> {
  if (!input.userId) return toolError("userId is required for send action");
  if (!input.title) return toolError("title is required for send action");
  if (!input.message) return toolError("message is required for send action");

  await client.post("/my/notifications", {
    userId: input.userId,
    title: input.title,
    message: input.message,
  });

  return toolSuccess(`Notification sent to user ${input.userId}: "${input.title}"`);
}
