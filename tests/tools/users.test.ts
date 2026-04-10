import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleUsers } from "../../src/tools/users.js";
import type { StandShareClient } from "../../src/auth/client.js";

function mockClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  } as unknown as StandShareClient;
}

describe("handleUsers", () => {
  let client: ReturnType<typeof mockClient>;

  beforeEach(() => {
    client = mockClient();
  });

  describe("search", () => {
    it("searches users and returns formatted results", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: [
          {
            id: "usr_1",
            firstName: "Jane",
            lastName: "Smith",
            email: "jane@example.com",
            status: "active",
          },
        ],
        pagination: { page: 1, limit: 25, total: 1 },
      });

      const result = await handleUsers(client, {
        action: "search",
        query: "Jane",
      });

      expect(result.content[0].text).toContain("Jane Smith");
      expect(result.content[0].text).toContain("usr_1");
      expect(result.content[0].text).toContain("jane@example.com");
      expect(result.content[0].text).toContain("active");
      expect(client.get).toHaveBeenCalledWith(
        "/admin/users",
        expect.objectContaining({ search: "Jane" })
      );
    });

    it("returns empty message when no users found", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: [],
        pagination: { page: 1, limit: 25, total: 0 },
      });

      const result = await handleUsers(client, { action: "search", query: "Nonexistent" });
      expect(result.content[0].text).toContain("No users found");
    });
  });

  describe("get", () => {
    it("returns user details with roles and families", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "usr_1",
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        phone: "555-1234",
        status: "active",
        roles: ["admin", "worker"],
        families: [
          { id: "fam_1", name: "The Smiths" },
          { id: "fam_2", name: "The Joneses" },
        ],
      });

      const result = await handleUsers(client, { action: "get", userId: "usr_1" });

      expect(result.content[0].text).toContain("Jane Smith");
      expect(result.content[0].text).toContain("usr_1");
      expect(result.content[0].text).toContain("jane@example.com");
      expect(result.content[0].text).toContain("555-1234");
      expect(result.content[0].text).toContain("active");
      expect(result.content[0].text).toContain("admin");
      expect(result.content[0].text).toContain("worker");
      expect(result.content[0].text).toContain("The Smiths");
      expect(result.content[0].text).toContain("The Joneses");
    });

    it("returns error when userId is missing", async () => {
      const result = await handleUsers(client, { action: "get" });
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("userId is required");
    });
  });

  describe("create", () => {
    it("creates user and returns confirmation", async () => {
      (client.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "usr_new",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        status: "active",
      });

      const result = await handleUsers(client, {
        action: "create",
        email: "john@example.com",
        firstName: "John",
        lastName: "Doe",
        phone: "555-5678",
      });

      expect(result.content[0].text).toContain("Created");
      expect(result.content[0].text).toContain("John Doe");
      expect(result.content[0].text).toContain("usr_new");
      expect(client.post).toHaveBeenCalledWith(
        "/admin/users",
        expect.objectContaining({
          email: "john@example.com",
          firstName: "John",
          lastName: "Doe",
          phone: "555-5678",
        })
      );
    });

    it("returns error when email is missing on create", async () => {
      const result = await handleUsers(client, {
        action: "create",
        firstName: "John",
        lastName: "Doe",
      });
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("email is required");
    });

    it("returns error when firstName is missing on create", async () => {
      const result = await handleUsers(client, {
        action: "create",
        email: "john@example.com",
        lastName: "Doe",
      });
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("firstName is required");
    });

    it("returns error when lastName is missing on create", async () => {
      const result = await handleUsers(client, {
        action: "create",
        email: "john@example.com",
        firstName: "John",
      });
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("lastName is required");
    });
  });

  describe("invite", () => {
    it("sends invitation and returns confirmation", async () => {
      (client.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

      const result = await handleUsers(client, {
        action: "invite",
        email: "newuser@example.com",
        firstName: "Alice",
        lastName: "Wonder",
      });

      expect(result.content[0].text).toContain("Invitation sent to newuser@example.com");
      expect(client.post).toHaveBeenCalledWith(
        "/admin/users/invite",
        expect.objectContaining({
          email: "newuser@example.com",
          firstName: "Alice",
          lastName: "Wonder",
        })
      );
    });

    it("returns error when email is missing on invite", async () => {
      const result = await handleUsers(client, {
        action: "invite",
        firstName: "Alice",
      });
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("email is required");
    });
  });

  describe("error handling", () => {
    it("returns error for unknown action", async () => {
      const result = await handleUsers(client, { action: "invalid" } as any);
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("Unknown action");
    });

    it("returns error when API call fails", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("User not found")
      );

      const result = await handleUsers(client, { action: "search", query: "bad" });
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("User not found");
    });
  });
});
