import type { StandShareClient } from "../auth/client.js";
import type { ToolResult } from "../types/index.js";
import { toolSuccess, toolError } from "../types/index.js";
import { formatCurrency, formatDate, formatTable } from "../formatters/index.js";

interface FinancesInput {
  action: string;
  familyId?: string;
  eventId?: string;
  venueId?: string;
  dateFrom?: string;
  dateTo?: string;
  type?: string;
  limit?: number;
  templateId?: string;
}

export async function handleFinances(
  client: StandShareClient,
  input: FinancesInput
): Promise<ToolResult> {
  try {
    switch (input.action) {
      case "family_balance":
        return await familyBalance(client, input);
      case "event_revenue":
        return await eventRevenue(client, input);
      case "transactions":
        return await transactions(client, input);
      case "list_settlement_templates":
        return await listSettlementTemplates(client, input);
      case "get_settlement_template":
        return await getSettlementTemplate(client, input);
      default:
        return toolError(
          `Unknown action: ${input.action}. Valid actions: family_balance, event_revenue, transactions, list_settlement_templates, get_settlement_template`
        );
    }
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function familyBalance(client: StandShareClient, input: FinancesInput): Promise<ToolResult> {
  if (!input.familyId) return toolError("familyId is required for family_balance action");

  const data = await client.get<{
    balance: number;
    transactions: Array<{
      date: string;
      type: string;
      amount: number;
      description: string;
    }>;
  }>(`/families/${input.familyId}/account-statement`);

  let text = `**Balance: ${formatCurrency(data.balance)}**\n\n`;

  if (data.transactions && data.transactions.length > 0) {
    text += "**Recent Transactions:**\n";
    const rows = data.transactions.map((t) => ({
      Date: formatDate(t.date),
      Type: t.type,
      Amount: formatCurrency(t.amount),
      Description: t.description,
    }));
    text += formatTable(rows);
  } else {
    text += "No recent transactions.";
  }

  return toolSuccess(text);
}

async function eventRevenue(client: StandShareClient, input: FinancesInput): Promise<ToolResult> {
  if (!input.eventId) return toolError("eventId is required for event_revenue action");

  const data = await client.get<{
    totalCommission: number;
    ccTips: number;
    perPersonPayments: number;
    workerCount: number;
    totalRevenue: number;
  }>(`/events/${input.eventId}/financials`);

  let text = `**Event Financial Summary**\n\n`;
  text += `- Total Commission: ${formatCurrency(data.totalCommission)}\n`;
  text += `- CC Tips: ${formatCurrency(data.ccTips)}\n`;
  text += `- Per-Person Payments: ${formatCurrency(data.perPersonPayments)}\n`;
  text += `- Worker Count: ${data.workerCount}\n`;
  text += `- Total Revenue: ${formatCurrency(data.totalRevenue)}`;

  return toolSuccess(text);
}

async function transactions(client: StandShareClient, input: FinancesInput): Promise<ToolResult> {
  const params: Record<string, string | number | boolean | undefined> = {};
  if (input.familyId) params.accountId = input.familyId;
  if (input.type) params.type = input.type;
  if (input.dateFrom) params.startDate = input.dateFrom;
  if (input.dateTo) params.endDate = input.dateTo;
  if (input.limit !== undefined) params.limit = input.limit;

  const data = await client.get<{
    data: Array<{
      date: string;
      type: string;
      amount: number;
      description: string;
    }>;
  }>("/ledger/entries", params);

  if (data.data.length === 0) {
    return toolSuccess("No transactions found.");
  }

  const rows = data.data.map((t) => ({
    Date: formatDate(t.date),
    Type: t.type,
    Amount: formatCurrency(t.amount),
    Description: t.description,
  }));

  return toolSuccess(formatTable(rows));
}

async function listSettlementTemplates(client: StandShareClient, _input: FinancesInput): Promise<ToolResult> {
  const data = await client.get<Array<{
    id: string;
    name: string;
    description?: string;
  }>>("/settlement-templates");

  if (data.length === 0) {
    return toolSuccess("No settlement templates found.");
  }

  const rows = data.map((t) => ({
    Template: `${t.name} (${t.id})`,
    Description: t.description ?? "",
  }));

  return toolSuccess(formatTable(rows));
}

async function getSettlementTemplate(client: StandShareClient, input: FinancesInput): Promise<ToolResult> {
  if (!input.templateId) return toolError("templateId is required for get_settlement_template action");

  const data = await client.get<{
    id: string;
    name: string;
    description?: string;
    lineItems: Array<{
      name: string;
      type: string;
      value: number;
    }>;
  }>(`/settlement-templates/${input.templateId}`);

  let text = `**${data.name}** (${data.id})\n`;
  if (data.description) {
    text += `${data.description}\n`;
  }

  if (data.lineItems && data.lineItems.length > 0) {
    text += `\n**Line Items:**\n`;
    const rows = data.lineItems.map((item) => ({
      Name: item.name,
      Type: item.type,
      Value: String(item.value),
    }));
    text += formatTable(rows);
  }

  return toolSuccess(text);
}
