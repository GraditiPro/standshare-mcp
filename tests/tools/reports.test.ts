import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleReports } from "../../src/tools/reports.js";
import type { StandShareClient } from "../../src/auth/client.js";

function mockClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  } as unknown as StandShareClient;
}

describe("handleReports", () => {
  let client: ReturnType<typeof mockClient>;

  beforeEach(() => {
    client = mockClient();
  });

  describe("dashboard", () => {
    it("returns formatted summary with all metrics", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        totalEvents: 42,
        upcomingEvents: 8,
        totalFamilies: 150,
        totalWorkers: 320,
        activeWorkers: 210,
        totalEarnings: 125000.5,
      });

      const result = await handleReports(client, { action: "dashboard" });

      expect(result.content[0].text).toContain("Organization Dashboard");
      expect(result.content[0].text).toContain("Total Events");
      expect(result.content[0].text).toContain("42");
      expect(result.content[0].text).toContain("Upcoming Events");
      expect(result.content[0].text).toContain("8");
      expect(result.content[0].text).toContain("Total Families");
      expect(result.content[0].text).toContain("150");
      expect(result.content[0].text).toContain("Total Workers");
      expect(result.content[0].text).toContain("320");
      expect(result.content[0].text).toContain("Active Workers");
      expect(result.content[0].text).toContain("210");
      expect(result.content[0].text).toContain("Total Earnings");
      expect(result.content[0].text).toContain("$125,000.50");
      expect(client.get).toHaveBeenCalledWith("/admin/dashboard");
    });
  });

  describe("financial_summary", () => {
    it("returns financial report with period and bullet list", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        totalRevenue: 50000.0,
        totalDistributed: 42000.0,
        totalDeductions: 3000.0,
        events: 12,
      });

      const result = await handleReports(client, {
        action: "financial_summary",
        dateFrom: "2026-01-01",
        dateTo: "2026-03-31",
      });

      expect(result.content[0].text).toContain("Financial Summary");
      expect(result.content[0].text).toContain("2026-01-01");
      expect(result.content[0].text).toContain("2026-03-31");
      expect(result.content[0].text).toContain("Total Revenue");
      expect(result.content[0].text).toContain("$50,000.00");
      expect(result.content[0].text).toContain("Total Distributed");
      expect(result.content[0].text).toContain("$42,000.00");
      expect(result.content[0].text).toContain("Total Deductions");
      expect(result.content[0].text).toContain("$3,000.00");
      expect(result.content[0].text).toContain("Events");
      expect(result.content[0].text).toContain("12");
      expect(client.get).toHaveBeenCalledWith(
        "/ledger/reports/summary",
        expect.objectContaining({
          startDate: "2026-01-01",
          endDate: "2026-03-31",
        })
      );
    });

    it("returns financial report without date filter", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        totalRevenue: 200000.0,
        totalDistributed: 180000.0,
        totalDeductions: 10000.0,
        events: 50,
      });

      const result = await handleReports(client, { action: "financial_summary" });

      expect(result.content[0].text).toContain("Financial Summary");
      expect(result.content[0].text).toContain("$200,000.00");
      expect(result.content[0].text).toContain("50");
    });
  });

  describe("compliance_status", () => {
    it("returns overview with totals and non-compliant families table", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        totalFamilies: 150,
        compliant: 142,
        nonCompliant: 8,
        nonCompliantFamilies: [
          {
            id: "fam_1",
            name: "Smith Family",
            missingDocuments: ["W9", "Insurance Certificate"],
          },
          {
            id: "fam_2",
            name: "Johnson Family",
            missingDocuments: ["Background Check"],
          },
        ],
      });

      const result = await handleReports(client, { action: "compliance_status" });

      expect(result.content[0].text).toContain("Compliance Status");
      expect(result.content[0].text).toContain("Total Families");
      expect(result.content[0].text).toContain("150");
      expect(result.content[0].text).toContain("Compliant");
      expect(result.content[0].text).toContain("142");
      expect(result.content[0].text).toContain("Non-Compliant");
      expect(result.content[0].text).toContain("8");
      expect(result.content[0].text).toContain("Smith Family");
      expect(result.content[0].text).toContain("fam_1");
      expect(result.content[0].text).toContain("W9");
      expect(result.content[0].text).toContain("Insurance Certificate");
      expect(result.content[0].text).toContain("Johnson Family");
      expect(result.content[0].text).toContain("Background Check");
      expect(client.get).toHaveBeenCalledWith("/reports/compliance", {});
    });

    it("passes familyId filter when provided", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        totalFamilies: 1,
        compliant: 0,
        nonCompliant: 1,
        nonCompliantFamilies: [
          {
            id: "fam_1",
            name: "Smith Family",
            missingDocuments: ["W9"],
          },
        ],
      });

      const result = await handleReports(client, {
        action: "compliance_status",
        familyId: "fam_1",
      });

      expect(result.content[0].text).toContain("Smith Family");
      expect(client.get).toHaveBeenCalledWith(
        "/reports/compliance",
        expect.objectContaining({ familyId: "fam_1" })
      );
    });

    it("returns overview with no non-compliant table when all are compliant", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        totalFamilies: 50,
        compliant: 50,
        nonCompliant: 0,
        nonCompliantFamilies: [],
      });

      const result = await handleReports(client, { action: "compliance_status" });

      expect(result.content[0].text).toContain("Compliance Status");
      expect(result.content[0].text).toContain("50");
      expect(result.content[0].text).not.toContain("Non-Compliant Families:");
    });
  });

  describe("error handling", () => {
    it("returns error for unknown action", async () => {
      const result = await handleReports(client, { action: "invalid" } as any);
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("Unknown action");
    });

    it("returns error when API call fails", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Unauthorized")
      );

      const result = await handleReports(client, { action: "dashboard" });
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("Unauthorized");
    });
  });
});
