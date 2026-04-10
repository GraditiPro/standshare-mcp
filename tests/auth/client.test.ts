import { describe, it, expect, vi, beforeEach } from "vitest";
import { StandShareClient } from "../../src/auth/client.js";
import type { AuthStrategy } from "../../src/types/index.js";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function createMockAuth(headers: Record<string, string> = { Authorization: "Bearer test" }): AuthStrategy {
  return {
    getHeaders: vi.fn().mockResolvedValue(headers),
    onUnauthorized: vi.fn().mockResolvedValue(false),
  };
}

describe("StandShareClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("makes GET requests with auth and tenant headers", async () => {
    const auth = createMockAuth();
    const client = new StandShareClient("https://api.test.com", "westlake", auth);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: "1", name: "Test" }] }),
    });

    const result = await client.get("/events", { status: "upcoming" });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.test.com/events?status=upcoming",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test",
          "X-Tenant-Slug": "westlake",
        }),
      })
    );
    expect(result).toEqual({ data: [{ id: "1", name: "Test" }] });
  });

  it("makes POST requests with JSON body", async () => {
    const auth = createMockAuth();
    const client = new StandShareClient("https://api.test.com", "westlake", auth);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "new_1", name: "New Event" }),
    });

    const body = { name: "New Event", date: "2026-05-01" };
    const result = await client.post("/events", body);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.test.com/events",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(body),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );
    expect(result).toEqual({ id: "new_1", name: "New Event" });
  });

  it("retries once on 401 after successful auth refresh", async () => {
    const auth: AuthStrategy = {
      getHeaders: vi.fn().mockResolvedValue({ Authorization: "Bearer refreshed" }),
      onUnauthorized: vi.fn().mockResolvedValue(true),
    };
    const client = new StandShareClient("https://api.test.com", "westlake", auth);

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: "Token expired" }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: "success" }),
    });

    const result = await client.get("/events");

    expect(auth.onUnauthorized).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ data: "success" });
  });

  it("throws on non-401 errors with message", async () => {
    const auth = createMockAuth();
    const client = new StandShareClient("https://api.test.com", "westlake", auth);

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ message: "Event not found" }),
    });

    await expect(client.get("/events/bad-id")).rejects.toThrow("Event not found");
  });

  it("throws on 401 when refresh fails", async () => {
    const auth: AuthStrategy = {
      getHeaders: vi.fn().mockResolvedValue({ Authorization: "Bearer expired" }),
      onUnauthorized: vi.fn().mockResolvedValue(false),
    };
    const client = new StandShareClient("https://api.test.com", "westlake", auth);

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: "Unauthorized" }),
    });

    await expect(client.get("/events")).rejects.toThrow("Authentication failed");
  });

  it("omits undefined query params", async () => {
    const auth = createMockAuth();
    const client = new StandShareClient("https://api.test.com", "westlake", auth);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await client.get("/events", { status: "upcoming", venueId: undefined });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toBe("https://api.test.com/events?status=upcoming");
    expect(calledUrl).not.toContain("venueId");
  });
});
