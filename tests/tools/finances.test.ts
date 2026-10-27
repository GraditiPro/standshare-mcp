import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleFinances } from "../../src/tools/finances.js";
import type { StandShareClient } from "../../src/auth/client.js";

function mockClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  } as unknown as StandShareClient;
}

describe("handleFinances", () => {
  let client: ReturnType<typeof mockClient>;

  beforeEach(() => {
    client = mockClient();
  });

  describe("family_balance", () => {
    it("returns formatted balance and transactions table", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        balance: 1250.75,
        transactions: [
          {
            date: "2026-04-01T00:00:00Z",
            type: "event_commission",
            amount: 500.0,
            description: "Cardinals Game commission",
          },
          {
            date: "2026-03-15T00:00:00Z",
            type: "withdrawal",
            amount: -250.0,
            description: "Payout to family",
          },
        ],
      });

      const result = await handleFinances(client, {
        action: "family_balance",
        familyId: "fam_1",
      });

      expect(result.content[0].text).toContain("$1,250.75");
      expect(result.content[0].text).toContain("event_commission");
      expect(result.content[0].text).toContain("$500.00");
      expect(result.content[0].text).toContain("Cardinals Game commission");
      expect(result.content[0].text).toContain("-$250.00");
      expect(client.get).toHaveBeenCalledWith("/families/fam_1/account-statement");
    });

    it("returns balance with no transactions message when empty", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        balance: 0,
        transactions: [],
      });

      const result = await handleFinances(client, {
        action: "family_balance",
        familyId: "fam_1",
      });

      expect(result.content[0].text).toContain("$0.00");
      expect(result.content[0].text).toContain("No recent transactions");
    });

    it("returns error when familyId is missing", async () => {
      const result = await handleFinances(client, { action: "family_balance" });
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("familyId is required");
    });
  });

  describe("event_revenue", () => {
    it("returns financial summary with all totals", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        totalCommission: 1200.0,
        ccTips: 150.0,
        perPersonPayments: 300.0,
        workerCount: 8,
        totalRevenue: 1650.0,
      });

      const result = await handleFinances(client, {
        action: "event_revenue",
        eventId: "evt_1",
      });

      expect(result.content[0].text).toContain("$1,200.00");
      expect(result.content[0].text).toContain("$150.00");
      expect(result.content[0].text).toContain("$300.00");
      expect(result.content[0].text).toContain("8");
      expect(result.content[0].text).toContain("$1,650.00");
      expect(client.get).toHaveBeenCalledWith("/events/evt_1/financials");
    });

    it("returns error when eventId is missing", async () => {
      const result = await handleFinances(client, { action: "event_revenue" });
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("eventId is required");
    });
  });

  describe("transactions", () => {
    it("returns transactions table with filters applied", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: [
          {
            date: "2026-04-01T00:00:00Z",
            type: "event_commission",
            amount: 500.0,
            description: "Commission entry",
          },
        ],
      });

      const result = await handleFinances(client, {
        action: "transactions",
        familyId: "fam_1",
        type: "event_commission",
        dateFrom: "2026-01-01",
        dateTo: "2026-04-30",
      });

      expect(result.content[0].text).toContain("event_commission");
      expect(result.content[0].text).toContain("$500.00");
      expect(result.content[0].text).toContain("Commission entry");
      expect(client.get).toHaveBeenCalledWith(
        "/ledger/entries",
        expect.objectContaining({
          accountId: "fam_1",
          type: "event_commission",
          startDate: "2026-01-01",
          endDate: "2026-04-30",
        })
      );
    });

    it("returns empty message when no transactions found", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: [] });

      const result = await handleFinances(client, { action: "transactions" });
      expect(result.content[0].text).toContain("No transactions found");
    });
  });

  // Money is drafted elsewhere and committed only in the StandShare web app.
  // 1.0.0 let an AI client settle events and move money from here; these four
  // actions must stay gone. Each input is what 1.0.0 needed to reach its POST,
  // so the "no POST" assertion cannot pass just because validation bailed out.
  describe("removed money actions", () => {
    const removed: Array<[string, Record<string, unknown>]> = [
      ["settle_event", { eventId: "e1" }],
      [
        "record_settlement",
        { eventId: "e1", stands: [{ standNumber: 1, totalCommission: 1, ccTips: 0, workerCount: 1 }] },
      ],
      ["credit_account", { familyId: "f1", amount: 1 }],
      ["record_scholarship", { familyId: "f1", amount: 1 }],
    ];

    it.each(removed)("%s is an unknown action and never calls the API", async (action, inputs) => {
      const result = await handleFinances(client, { action, ...inputs });

      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("Unknown action");
      expect(client.post).not.toHaveBeenCalled();
      expect(client.put).not.toHaveBeenCalled();
      expect(client.patch).not.toHaveBeenCalled();
    });

    it("lists only the read-only actions as valid", async () => {
      const result = await handleFinances(client, { action: "settle_event" });

      const text = result.content[0].text;
      expect(text).toContain("family_balance, event_revenue, transactions, list_settlement_templates, get_settlement_template");
      for (const [action] of removed) {
        expect(text.split("Valid actions:")[1]).not.toContain(action);
      }
    });
  });

  describe("list_settlement_templates", () => {
    it("returns formatted template list with name and description", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        { id: "tmpl_1", name: "Standard Split", description: "Equal split among all workers" },
        { id: "tmpl_2", name: "Seniority Weighted", description: "Senior workers get higher share" },
      ]);

      const result = await handleFinances(client, { action: "list_settlement_templates" });

      expect(result.content[0].text).toContain("Standard Split");
      expect(result.content[0].text).toContain("tmpl_1");
      expect(result.content[0].text).toContain("Equal split among all workers");
      expect(result.content[0].text).toContain("Seniority Weighted");
      expect(client.get).toHaveBeenCalledWith("/settlement-templates");
    });

    it("returns empty message when no templates found", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

      const result = await handleFinances(client, { action: "list_settlement_templates" });
      expect(result.content[0].text).toContain("No settlement templates found");
    });
  });

  describe("get_settlement_template", () => {
    it("returns template details with line items table", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "tmpl_1",
        name: "Standard Split",
        description: "Equal split among all workers",
        lineItems: [
          { name: "Worker Share", type: "percentage", value: 80 },
          { name: "Admin Fee", type: "flat", value: 25 },
        ],
      });

      const result = await handleFinances(client, {
        action: "get_settlement_template",
        templateId: "tmpl_1",
      });

      expect(result.content[0].text).toContain("Standard Split");
      expect(result.content[0].text).toContain("tmpl_1");
      expect(result.content[0].text).toContain("Equal split among all workers");
      expect(result.content[0].text).toContain("Worker Share");
      expect(result.content[0].text).toContain("percentage");
      expect(result.content[0].text).toContain("80");
      expect(client.get).toHaveBeenCalledWith("/settlement-templates/tmpl_1");
    });

    it("returns error when templateId is missing", async () => {
      const result = await handleFinances(client, { action: "get_settlement_template" });
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("templateId is required");
    });
  });

  describe("error handling", () => {
    it("returns error for unknown action", async () => {
      const result = await handleFinances(client, { action: "invalid" } as any);
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("Unknown action");
    });

    it("returns error when API call fails", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Family not found")
      );

      const result = await handleFinances(client, {
        action: "family_balance",
        familyId: "bad_id",
      });

      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("Family not found");
    });
  });
});
