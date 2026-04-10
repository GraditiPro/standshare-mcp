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

  describe("settle_event", () => {
    it("returns settlement confirmation with distributed amount and worker count", async () => {
      (client.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        totalDistributed: 980.0,
        workersPaid: 7,
        status: "completed",
      });

      const result = await handleFinances(client, {
        action: "settle_event",
        eventId: "evt_1",
        settlementTemplateId: "tmpl_1",
      });

      expect(result.content[0].text).toContain("$980.00");
      expect(result.content[0].text).toContain("7");
      expect(result.content[0].text).toContain("completed");
      expect(client.post).toHaveBeenCalledWith(
        "/events/evt_1/settlement/commit",
        expect.objectContaining({ settlementTemplateId: "tmpl_1" })
      );
    });

    it("returns error when eventId is missing", async () => {
      const result = await handleFinances(client, { action: "settle_event" });
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("eventId is required");
    });
  });

  describe("record_settlement", () => {
    it("records historical settlement and returns confirmation", async () => {
      (client.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        totalDistributed: 750.0,
        workersPaid: 5,
        status: "recorded",
      });

      const result = await handleFinances(client, {
        action: "record_settlement",
        eventId: "evt_2",
        stands: [
          { standNumber: 1, totalCommission: 400.0, ccTips: 50.0, workerCount: 3 },
          { standNumber: 2, totalCommission: 350.0, ccTips: 30.0, workerCount: 2 },
        ],
      });

      expect(result.content[0].text).toContain("$750.00");
      expect(result.content[0].text).toContain("5");
      expect(client.post).toHaveBeenCalledWith(
        "/events/evt_2/settlement/commit",
        expect.objectContaining({ stands: expect.any(Array) })
      );
    });

    it("returns error when stands is missing", async () => {
      const result = await handleFinances(client, {
        action: "record_settlement",
        eventId: "evt_1",
      });
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("stands is required");
    });
  });

  describe("credit_account", () => {
    it("returns confirmation after crediting account", async () => {
      (client.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "entry_abc",
        amount: 200.0,
        entryType: "event_commission",
      });

      const result = await handleFinances(client, {
        action: "credit_account",
        familyId: "fam_1",
        amount: 200.0,
        description: "Manual credit",
      });

      expect(result.content[0].text).toContain("$200.00");
      expect(result.content[0].text).toContain("event_commission");
      expect(result.content[0].text).toContain("entry_abc");
      expect(client.post).toHaveBeenCalledWith(
        "/ledger/entries",
        expect.objectContaining({
          accountId: "fam_1",
          amount: 200.0,
          entryType: "event_commission",
        })
      );
    });

    it("uses provided type for entryType", async () => {
      (client.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "entry_xyz",
        amount: 100.0,
        entryType: "scholarship",
      });

      const result = await handleFinances(client, {
        action: "credit_account",
        familyId: "fam_1",
        amount: 100.0,
        type: "scholarship",
      });

      expect(result.content[0].text).toContain("scholarship");
      expect(client.post).toHaveBeenCalledWith(
        "/ledger/entries",
        expect.objectContaining({ entryType: "scholarship" })
      );
    });

    it("returns error when familyId is missing", async () => {
      const result = await handleFinances(client, { action: "credit_account", amount: 100 });
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("familyId is required");
    });

    it("returns error when amount is missing", async () => {
      const result = await handleFinances(client, { action: "credit_account", familyId: "fam_1" });
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("amount is required");
    });
  });

  describe("record_scholarship", () => {
    it("returns confirmation after recording scholarship", async () => {
      (client.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "schol_1",
        amount: 500.0,
        status: "approved",
      });

      const result = await handleFinances(client, {
        action: "record_scholarship",
        familyId: "fam_1",
        amount: 500.0,
        status: "approved",
        date: "2026-04-01",
      });

      expect(result.content[0].text).toContain("$500.00");
      expect(result.content[0].text).toContain("approved");
      expect(result.content[0].text).toContain("schol_1");
      expect(client.post).toHaveBeenCalledWith(
        "/scholarships",
        expect.objectContaining({
          familyId: "fam_1",
          amount: 500.0,
          status: "approved",
          submittedAt: "2026-04-01",
        })
      );
    });

    it("returns error when familyId is missing", async () => {
      const result = await handleFinances(client, { action: "record_scholarship", amount: 500 });
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("familyId is required");
    });

    it("returns error when amount is missing", async () => {
      const result = await handleFinances(client, { action: "record_scholarship", familyId: "fam_1" });
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("amount is required");
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
