import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleFamilies } from "../../src/tools/families.js";
import type { StandShareClient } from "../../src/auth/client.js";

function mockClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  } as unknown as StandShareClient;
}

describe("handleFamilies", () => {
  let client: ReturnType<typeof mockClient>;

  beforeEach(() => {
    client = mockClient();
  });

  describe("search", () => {
    it("searches families and returns formatted results", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: [
          {
            id: "fam_1",
            name: "The Smiths",
            program: "spring-2026",
            status: "active",
          },
        ],
        pagination: { page: 1, limit: 25, total: 1 },
      });

      const result = await handleFamilies(client, {
        action: "search",
        query: "Smith",
      });

      expect(result.content[0].text).toContain("The Smiths");
      expect(result.content[0].text).toContain("fam_1");
      expect(result.content[0].text).toContain("spring-2026");
      expect(client.get).toHaveBeenCalledWith("/families", expect.objectContaining({ search: "Smith" }));
    });

    it("returns empty message when no families found", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: [],
        pagination: { page: 1, limit: 25, total: 0 },
      });

      const result = await handleFamilies(client, { action: "search", query: "Nonexistent" });
      expect(result.content[0].text).toContain("No families found");
    });
  });

  describe("get", () => {
    it("returns family details with balance and members", async () => {
      (client.get as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          id: "fam_1",
          name: "The Smiths",
          program: "spring-2026",
          status: "active",
          members: [
            { id: "usr_1", name: "Jane Smith", role: "primary" },
            { id: "usr_2", name: "John Smith", role: "member" },
          ],
        })
        .mockResolvedValueOnce({ balance: 150.75 });

      const result = await handleFamilies(client, { action: "get", familyId: "fam_1" });

      expect(result.content[0].text).toContain("The Smiths");
      expect(result.content[0].text).toContain("fam_1");
      expect(result.content[0].text).toContain("spring-2026");
      expect(result.content[0].text).toContain("$150.75");
      expect(result.content[0].text).toContain("Jane Smith");
      expect(result.content[0].text).toContain("John Smith");
    });

    it("returns balance of $0.00 when account-statement fails", async () => {
      (client.get as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          id: "fam_1",
          name: "The Smiths",
          program: "spring-2026",
          status: "active",
          members: [],
        })
        .mockRejectedValueOnce(new Error("Not found"));

      const result = await handleFamilies(client, { action: "get", familyId: "fam_1" });

      expect(result.content[0].text).toContain("$0.00");
      expect(result).not.toHaveProperty("isError");
    });

    it("returns error when familyId is missing", async () => {
      const result = await handleFamilies(client, { action: "get" });
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("familyId is required");
    });
  });

  describe("create", () => {
    it("creates family and returns confirmation", async () => {
      (client.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "fam_new",
        name: "The Johnsons",
        program: "fall-2026",
        status: "active",
      });

      const result = await handleFamilies(client, {
        action: "create",
        familyName: "The Johnsons",
        program: "fall-2026",
        primaryContactUserId: "usr_10",
      });

      expect(result.content[0].text).toContain("Created");
      expect(result.content[0].text).toContain("The Johnsons");
      expect(result.content[0].text).toContain("fam_new");
      expect(client.post).toHaveBeenCalledWith(
        "/families",
        expect.objectContaining({
          familyName: "The Johnsons",
          program: "fall-2026",
          primaryContactUserId: "usr_10",
        })
      );
    });
  });

  describe("add_member", () => {
    it("adds member and returns confirmation", async () => {
      (client.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "usr_5",
        name: "Alice Johnson",
        role: "member",
      });

      const result = await handleFamilies(client, {
        action: "add_member",
        familyId: "fam_1",
        userId: "usr_5",
        role: "member",
      });

      expect(result.content[0].text).toContain("Alice Johnson");
      expect(result.content[0].text).toContain("usr_5");
      expect(result.content[0].text).toContain("member");
      expect(client.post).toHaveBeenCalledWith(
        "/families/fam_1/members",
        expect.objectContaining({ userId: "usr_5", role: "member" })
      );
    });
  });

  describe("error handling", () => {
    it("returns error for unknown action", async () => {
      const result = await handleFamilies(client, { action: "invalid" } as any);
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("Unknown action");
    });

    it("returns error when API call fails", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Family not found")
      );

      const result = await handleFamilies(client, { action: "search", query: "bad" });
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("Family not found");
    });
  });
});
