import type { StandShareClient } from "../auth/client.js";
import type { ToolResult } from "../types/index.js";
import { toolSuccess, toolError } from "../types/index.js";
import { formatCurrency, formatEntityRef, formatTable } from "../formatters/index.js";
import { formatPagination } from "../formatters/pagination.js";

interface FamiliesInput {
  action: string;
  familyId?: string;
  query?: string;
  program?: string;
  status?: string;
  familyName?: string;
  primaryContactUserId?: string;
  userId?: string;
  role?: string;
}

export async function handleFamilies(
  client: StandShareClient,
  input: FamiliesInput
): Promise<ToolResult> {
  try {
    switch (input.action) {
      case "search":
        return await searchFamilies(client, input);
      case "get":
        return await getFamily(client, input);
      case "create":
        return await createFamily(client, input);
      case "add_member":
        return await addMember(client, input);
      default:
        return toolError(`Unknown action: ${input.action}. Valid actions: search, get, create, add_member`);
    }
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function searchFamilies(client: StandShareClient, input: FamiliesInput): Promise<ToolResult> {
  const data = await client.get<{
    data: Array<{
      id: string;
      name: string;
      program: string;
      status: string;
    }>;
    pagination: { page: number; limit: number; total: number };
  }>("/families", {
    search: input.query,
    program: input.program,
    status: input.status,
  });

  if (data.data.length === 0) {
    const filters = [input.query, input.program, input.status].filter(Boolean).join(", ");
    return toolSuccess(`No families found${filters ? ` matching: ${filters}` : ""}.`);
  }

  const rows = data.data.map((f) => ({
    Family: formatEntityRef(f.name, f.id),
    Program: f.program,
    Status: f.status,
  }));

  const table = formatTable(rows);
  const pagination = formatPagination(data.pagination);
  return toolSuccess(`${table}\n\n${pagination}`);
}

async function getFamily(client: StandShareClient, input: FamiliesInput): Promise<ToolResult> {
  if (!input.familyId) return toolError("familyId is required for get action");

  const [family, accountStatement] = await Promise.all([
    client.get<{
      id: string;
      name: string;
      program: string;
      status: string;
      members?: Array<{ id: string; name: string; role: string }>;
    }>(`/families/${input.familyId}`),
    client
      .get<{ balance: number }>(`/families/${input.familyId}/account-statement`)
      .catch(() => ({ balance: 0 })),
  ]);

  let text = `**${family.name}** (${family.id})\n`;
  text += `- Program: ${family.program}\n`;
  text += `- Status: ${family.status}\n`;
  text += `- Balance: ${formatCurrency(accountStatement.balance)}\n`;

  if (family.members && family.members.length > 0) {
    text += `\n**Members (${family.members.length}):**\n`;
    const memberRows = family.members.map((m) => ({
      Member: formatEntityRef(m.name, m.id),
      Role: m.role,
    }));
    text += formatTable(memberRows);
  }

  return toolSuccess(text);
}

async function createFamily(client: StandShareClient, input: FamiliesInput): Promise<ToolResult> {
  if (!input.familyName) return toolError("familyName is required for create action");
  if (!input.program) return toolError("program is required for create action");
  if (!input.primaryContactUserId) return toolError("primaryContactUserId is required for create action");

  const family = await client.post<{ id: string; name: string; program: string; status: string }>(
    "/families",
    {
      familyName: input.familyName,
      program: input.program,
      primaryContactUserId: input.primaryContactUserId,
    }
  );

  let text = `Created family: **${family.name}** (${family.id})\n`;
  text += `- Program: ${family.program}\n`;
  text += `- Status: ${family.status}`;
  return toolSuccess(text);
}

async function addMember(client: StandShareClient, input: FamiliesInput): Promise<ToolResult> {
  if (!input.familyId) return toolError("familyId is required for add_member action");
  if (!input.userId) return toolError("userId is required for add_member action");

  const member = await client.post<{ id: string; name: string; role: string }>(
    `/families/${input.familyId}/members`,
    {
      userId: input.userId,
      role: input.role,
    }
  );

  return toolSuccess(
    `Added member: **${member.name}** (${member.id}) — role: ${member.role}`
  );
}
