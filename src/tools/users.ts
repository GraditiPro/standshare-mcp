import type { StandShareClient } from "../auth/client.js";
import type { ToolResult } from "../types/index.js";
import { toolSuccess, toolError } from "../types/index.js";
import { formatEntityRef, formatTable } from "../formatters/index.js";
import { formatPagination } from "../formatters/pagination.js";

interface UsersInput {
  action: string;
  userId?: string;
  query?: string;
  role?: string;
  status?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export async function handleUsers(
  client: StandShareClient,
  input: UsersInput
): Promise<ToolResult> {
  try {
    switch (input.action) {
      case "search":
        return await searchUsers(client, input);
      case "get":
        return await getUser(client, input);
      case "create":
        return await createUser(client, input);
      case "invite":
        return await inviteUser(client, input);
      default:
        return toolError(`Unknown action: ${input.action}. Valid actions: search, get, create, invite`);
    }
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function searchUsers(client: StandShareClient, input: UsersInput): Promise<ToolResult> {
  const data = await client.get<{
    data: Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      status: string;
    }>;
    pagination: { page: number; limit: number; total: number };
  }>("/admin/users", {
    search: input.query,
    role: input.role,
    status: input.status,
  });

  if (data.data.length === 0) {
    const filters = [input.query, input.role, input.status].filter(Boolean).join(", ");
    return toolSuccess(`No users found${filters ? ` matching: ${filters}` : ""}.`);
  }

  const rows = data.data.map((u) => ({
    User: formatEntityRef(`${u.firstName} ${u.lastName}`, u.id),
    Email: u.email,
    Status: u.status,
  }));

  const table = formatTable(rows);
  const pagination = formatPagination(data.pagination);
  return toolSuccess(`${table}\n\n${pagination}`);
}

async function getUser(client: StandShareClient, input: UsersInput): Promise<ToolResult> {
  if (!input.userId) return toolError("userId is required for get action");

  const user = await client.get<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    status: string;
    roles?: string[];
    families?: Array<{ id: string; name: string }>;
  }>(`/admin/users/${input.userId}`);

  let text = `**${user.firstName} ${user.lastName}** (${user.id})\n`;
  text += `- Email: ${user.email}\n`;
  if (user.phone) {
    text += `- Phone: ${user.phone}\n`;
  }
  text += `- Status: ${user.status}\n`;

  if (user.roles && user.roles.length > 0) {
    text += `- Roles: ${user.roles.join(", ")}\n`;
  }

  if (user.families && user.families.length > 0) {
    text += `\n**Families (${user.families.length}):**\n`;
    const familyRows = user.families.map((f) => ({
      Family: formatEntityRef(f.name, f.id),
    }));
    text += formatTable(familyRows);
  }

  return toolSuccess(text);
}

async function createUser(client: StandShareClient, input: UsersInput): Promise<ToolResult> {
  if (!input.email) return toolError("email is required for create action");
  if (!input.firstName) return toolError("firstName is required for create action");
  if (!input.lastName) return toolError("lastName is required for create action");

  const body: Record<string, unknown> = {
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
  };
  if (input.phone) body.phone = input.phone;

  const user = await client.post<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
  }>("/admin/users", body);

  let text = `Created user: **${user.firstName} ${user.lastName}** (${user.id})\n`;
  text += `- Email: ${user.email}\n`;
  text += `- Status: ${user.status}`;
  return toolSuccess(text);
}

async function inviteUser(client: StandShareClient, input: UsersInput): Promise<ToolResult> {
  if (!input.email) return toolError("email is required for invite action");

  const body: Record<string, unknown> = {
    email: input.email,
  };
  if (input.firstName) body.firstName = input.firstName;
  if (input.lastName) body.lastName = input.lastName;

  await client.post<unknown>("/admin/users/invite", body);

  return toolSuccess(`Invitation sent to ${input.email}`);
}
