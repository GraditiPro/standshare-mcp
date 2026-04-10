import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleEvents } from "../../src/tools/events.js";
import type { StandShareClient } from "../../src/auth/client.js";

function mockClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  } as unknown as StandShareClient;
}

describe("handleEvents", () => {
  let client: ReturnType<typeof mockClient>;

  beforeEach(() => {
    client = mockClient();
  });

  describe("search", () => {
    it("searches events and returns formatted results", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: [
          {
            id: "evt_1",
            name: "Cardinals Game",
            venue: "Raymond James",
            date: "2026-04-15T18:00:00Z",
            status: "upcoming",
            maxWorkers: 20,
          },
        ],
        pagination: { page: 1, limit: 25, total: 1 },
      });

      const result = await handleEvents(client, {
        action: "search",
        query: "Cardinals",
      });

      expect(result.content[0].text).toContain("Cardinals Game");
      expect(result.content[0].text).toContain("evt_1");
      expect(result.content[0].text).toContain("Raymond James");
      expect(client.get).toHaveBeenCalledWith("/events", expect.objectContaining({ search: "Cardinals" }));
    });

    it("returns empty message when no events found", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: [],
        pagination: { page: 1, limit: 25, total: 0 },
      });

      const result = await handleEvents(client, { action: "search", query: "Nonexistent" });
      expect(result.content[0].text).toContain("No events found");
    });
  });

  describe("get", () => {
    it("returns formatted event details", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "evt_1",
        name: "Cardinals Game",
        venue: "Raymond James",
        date: "2026-04-15T18:00:00Z",
        status: "upcoming",
        maxWorkers: 20,
        perPersonRate: 15.0,
        waitlistEnabled: true,
        fundDistributionEnabled: true,
        stands: [
          { id: "std_1", standNumber: 1, maxWorkers: 5 },
          { id: "std_2", standNumber: 2, maxWorkers: 5 },
        ],
      });

      const result = await handleEvents(client, { action: "get", eventId: "evt_1" });

      expect(result.content[0].text).toContain("Cardinals Game");
      expect(result.content[0].text).toContain("$15.00");
      expect(result.content[0].text).toContain("Stand 1");
      expect(result.content[0].text).toContain("Stand 2");
    });
  });

  describe("create", () => {
    it("creates event and returns confirmation", async () => {
      (client.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "evt_new",
        name: "Post Malone Concert",
        venue: "Raymond James",
        date: "2026-05-01T19:00:00Z",
        status: "upcoming",
      });

      const result = await handleEvents(client, {
        action: "create",
        name: "Post Malone Concert",
        venueId: "ven_1",
        date: "2026-05-01T19:00:00Z",
        maxWorkers: 30,
      });

      expect(result.content[0].text).toContain("Created");
      expect(result.content[0].text).toContain("Post Malone Concert");
      expect(result.content[0].text).toContain("evt_new");
    });
  });

  describe("add_stand", () => {
    it("adds stand and returns confirmation", async () => {
      (client.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "std_new",
        standNumber: 3,
        maxWorkers: 5,
      });

      const result = await handleEvents(client, {
        action: "add_stand",
        eventId: "evt_1",
        standNumber: 3,
        maxWorkers: 5,
      });

      expect(result.content[0].text).toContain("Stand 3");
      expect(result.content[0].text).toContain("std_new");
    });
  });

  describe("error handling", () => {
    it("returns error for unknown action", async () => {
      const result = await handleEvents(client, { action: "invalid" } as any);
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("Unknown action");
    });

    it("returns error when API call fails", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Event not found")
      );

      const result = await handleEvents(client, { action: "get", eventId: "bad_id" });
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("Event not found");
    });
  });
});
