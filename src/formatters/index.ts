export function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (amount < 0) return `-$${formatted}`;
  return `$${formatted}`;
}

export function formatDate(isoDate: string): string {
  // Date-only strings (YYYY-MM-DD) are parsed as UTC midnight, which can roll
  // back a day in negative-offset timezones. Parse them as local time instead.
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(isoDate);
  const date = isDateOnly
    ? new Date(`${isoDate}T00:00:00`)
    : new Date(isoDate);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatEntityRef(name: string, id: string): string {
  return `${name} (${id})`;
}

export function formatTable(rows: Array<Record<string, string>>): string {
  if (rows.length === 0) return "No results.";

  const headers = Object.keys(rows[0]);
  const headerRow = `| ${headers.join(" | ")} |`;
  const separator = `|${headers.map(() => "---").join("|")}|`;
  const dataRows = rows
    .map((row) => `| ${headers.map((h) => row[h] ?? "").join(" | ")} |`)
    .join("\n");

  return `${headerRow}\n${separator}\n${dataRows}`;
}

export function formatList(items: string[]): string {
  if (items.length === 0) return "No results.";
  return items.map((item) => `- ${item}`).join("\n");
}
