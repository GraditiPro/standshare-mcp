import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleVenues } from "../../src/tools/venues.js";
import type { StandShareClient } from "../../src/auth/client.js";

function mockClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  } as unknown as StandShareClient;
}

describe("handleVenues", () => {
  let client: ReturnType<typeof mockClient>;

  beforeEach(() => {
    client = mockClient();
  });

  describe("search", () => {
    it("searches venues and returns formatted results with name, id, location", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: [
          {
            id: "ven_1",
            name: "Raymond James Stadium",
            city: "Tampa",
            state: "FL",
            capacity: 65000,
          },
        ],
      });

      const result = await handleVenues(client, {
        action: "search",
        query: "Raymond",
      });

      expect(result.content[0].text).toContain("Raymond James Stadium");
      expect(result.content[0].text).toContain("ven_1");
      expect(result.content[0].text).toContain("Tampa");
      expect(result.content[0].text).toContain("FL");
      expect(client.get).toHaveBeenCalledWith("/venues", expect.objectContaining({ search: "Raymond" }));
    });

    it("filters by city and state", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: [
          {
            id: "ven_2",
            name: "Amalie Arena",
            city: "Tampa",
            state: "FL",
            capacity: 20000,
          },
        ],
      });

      const result = await handleVenues(client, {
        action: "search",
        city: "Tampa",
        state: "FL",
      });

      expect(result.content[0].text).toContain("Amalie Arena");
      expect(client.get).toHaveBeenCalledWith("/venues", expect.objectContaining({ city: "Tampa", state: "FL" }));
    });

    it("returns empty message when no venues found", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: [],
      });

      const result = await handleVenues(client, { action: "search", query: "Nonexistent" });
      expect(result.content[0].text).toContain("No venues found");
    });
  });

  describe("get", () => {
    it("returns venue details with address, capacity formatted as '65,000'", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "ven_1",
        name: "Raymond James Stadium",
        address: "4201 N Dale Mabry Hwy",
        city: "Tampa",
        state: "FL",
        zip: "33607",
        capacity: 65000,
        contactPerson: "Jane Smith",
      });

      const result = await handleVenues(client, { action: "get", venueId: "ven_1" });

      expect(result.content[0].text).toContain("Raymond James Stadium");
      expect(result.content[0].text).toContain("ven_1");
      expect(result.content[0].text).toContain("4201 N Dale Mabry Hwy");
      expect(result.content[0].text).toContain("Tampa");
      expect(result.content[0].text).toContain("FL");
      expect(result.content[0].text).toContain("33607");
      expect(result.content[0].text).toContain("65,000");
      expect(result.content[0].text).toContain("Jane Smith");
      expect(client.get).toHaveBeenCalledWith("/venues/ven_1");
    });

    it("returns venue details without contactPerson when not present", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "ven_2",
        name: "Amalie Arena",
        address: "401 Channelside Dr",
        city: "Tampa",
        state: "FL",
        zip: "33602",
        capacity: 20500,
      });

      const result = await handleVenues(client, { action: "get", venueId: "ven_2" });

      expect(result.content[0].text).toContain("Amalie Arena");
      expect(result.content[0].text).toContain("20,500");
      expect(result.content[0].text).not.toContain("Contact:");
    });
  });

  describe("error handling", () => {
    it("returns error for missing venueId on get", async () => {
      const result = await handleVenues(client, { action: "get" });
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("venueId is required");
    });

    it("returns error for unknown action", async () => {
      const result = await handleVenues(client, { action: "invalid" } as any);
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("Unknown action");
    });

    it("returns error when API call fails", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Venue not found")
      );

      const result = await handleVenues(client, { action: "get", venueId: "bad_id" });
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("Venue not found");
    });
  });
});
