import type { StandShareClient } from "../auth/client.js";
import type { ToolResult } from "../types/index.js";
import { toolSuccess, toolError } from "../types/index.js";
import { formatCurrency, formatTable } from "../formatters/index.js";

interface ReportsInput {
  action: string;
  dateFrom?: string;
  dateTo?: string;
  familyId?: string;
}

export async function handleReports(
  client: StandShareClient,
  input: ReportsInput
): Promise<ToolResult> {
  try {
    switch (input.action) {
      case "dashboard":
        return await getDashboard(client);
      case "financial_summary":
        return await getFinancialSummary(client, input);
      case "compliance_status":
        return await getComplianceStatus(client, input);
      default:
        return toolError(
          `Unknown action: ${input.action}. Valid actions: dashboard, financial_summary, compliance_status`
        );
    }
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function getDashboard(client: StandShareClient): Promise<ToolResult> {
  const data = await client.get<{
    totalEvents: number;
    upcomingEvents: number;
    totalFamilies: number;
    totalWorkers: number;
    activeWorkers: number;
    totalEarnings: number;
  }>("/admin/dashboard");

  const rows = [
    { Metric: "Total Events", Value: String(data.totalEvents) },
    { Metric: "Upcoming Events", Value: String(data.upcomingEvents) },
    { Metric: "Total Families", Value: String(data.totalFamilies) },
    { Metric: "Total Workers", Value: String(data.totalWorkers) },
    { Metric: "Active Workers", Value: String(data.activeWorkers) },
    { Metric: "Total Earnings", Value: formatCurrency(data.totalEarnings) },
  ];

  return toolSuccess(`## Organization Dashboard\n\n${formatTable(rows)}`);
}

async function getFinancialSummary(
  client: StandShareClient,
  input: ReportsInput
): Promise<ToolResult> {
  const data = await client.get<{
    totalRevenue: number;
    totalDistributed: number;
    totalDeductions: number;
    events: number;
  }>("/ledger/reports/summary", {
    startDate: input.dateFrom,
    endDate: input.dateTo,
  });

  const periodLine =
    input.dateFrom && input.dateTo
      ? `Period: ${input.dateFrom} to ${input.dateTo}`
      : input.dateFrom
      ? `From: ${input.dateFrom}`
      : input.dateTo
      ? `To: ${input.dateTo}`
      : "All time";

  let text = `## Financial Summary\n\n${periodLine}\n\n`;
  text += `- Total Revenue: ${formatCurrency(data.totalRevenue)}\n`;
  text += `- Total Distributed: ${formatCurrency(data.totalDistributed)}\n`;
  text += `- Total Deductions: ${formatCurrency(data.totalDeductions)}\n`;
  text += `- Events: ${data.events}`;

  return toolSuccess(text);
}

async function getComplianceStatus(
  client: StandShareClient,
  input: ReportsInput
): Promise<ToolResult> {
  const params: Record<string, string | undefined> = {};
  if (input.familyId) params.familyId = input.familyId;

  const data = await client.get<{
    totalFamilies: number;
    compliant: number;
    nonCompliant: number;
    nonCompliantFamilies: Array<{
      id: string;
      name: string;
      missingDocuments: string[];
    }>;
  }>("/reports/compliance", params);

  let text = `## Compliance Status\n\n`;
  text += `- Total Families: ${data.totalFamilies}\n`;
  text += `- Compliant: ${data.compliant}\n`;
  text += `- Non-Compliant: ${data.nonCompliant}\n`;

  if (data.nonCompliantFamilies && data.nonCompliantFamilies.length > 0) {
    const rows = data.nonCompliantFamilies.map((f) => ({
      Family: `${f.name} (${f.id})`,
      "Missing Documents": f.missingDocuments.join(", "),
    }));
    text += `\n**Non-Compliant Families:**\n\n${formatTable(rows)}`;
  }

  return toolSuccess(text);
}
