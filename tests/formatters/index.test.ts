import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatEntityRef,
  formatTable,
  formatList,
} from "../../src/formatters/index.js";
import { formatPagination } from "../../src/formatters/pagination.js";

describe("formatCurrency", () => {
  it("formats positive amounts", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats negative amounts", () => {
    expect(formatCurrency(-50)).toBe("-$50.00");
  });
});

describe("formatDate", () => {
  it("formats ISO date to readable format", () => {
    const result = formatDate("2026-04-12T14:00:00Z");
    expect(result).toContain("April");
    expect(result).toContain("12");
    expect(result).toContain("2026");
  });

  it("handles date-only strings", () => {
    const result = formatDate("2026-04-12");
    expect(result).toContain("April");
    expect(result).toContain("12");
  });
});

describe("formatEntityRef", () => {
  it("formats name with ID", () => {
    expect(formatEntityRef("Raymond James Stadium", "venue_abc123")).toBe(
      "Raymond James Stadium (venue_abc123)"
    );
  });
});

describe("formatTable", () => {
  it("renders markdown table", () => {
    const rows = [
      { Name: "Alice", Role: "Admin" },
      { Name: "Bob", Role: "Worker" },
    ];
    const result = formatTable(rows);
    expect(result).toContain("| Name | Role |");
    expect(result).toContain("| Alice | Admin |");
    expect(result).toContain("| Bob | Worker |");
    expect(result).toContain("|---");
  });

  it("returns empty message for no rows", () => {
    expect(formatTable([])).toBe("No results.");
  });
});

describe("formatList", () => {
  it("renders bullet list", () => {
    const result = formatList(["one", "two", "three"]);
    expect(result).toBe("- one\n- two\n- three");
  });

  it("returns empty message for no items", () => {
    expect(formatList([])).toBe("No results.");
  });
});

describe("formatPagination", () => {
  it("formats pagination summary", () => {
    const result = formatPagination({ page: 1, limit: 10, total: 47 });
    expect(result).toBe("Showing 1-10 of 47. Use `page: 2` to see more.");
  });

  it("formats last page", () => {
    const result = formatPagination({ page: 5, limit: 10, total: 47 });
    expect(result).toBe("Showing 41-47 of 47.");
  });

  it("formats single page", () => {
    const result = formatPagination({ page: 1, limit: 25, total: 5 });
    expect(result).toBe("Showing all 5 results.");
  });
});
