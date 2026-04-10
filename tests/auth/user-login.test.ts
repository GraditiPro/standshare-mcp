import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserLoginAuth } from "../../src/auth/user-login.js";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("UserLoginAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs in on first getHeaders call", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        accessToken: "access_123",
        refreshToken: "refresh_456",
      }),
    });

    const auth = new UserLoginAuth(
      "https://api.test.com",
      "admin@test.com",
      "password123",
      "test-org"
    );
    const headers = await auth.getHeaders();

    expect(headers["Authorization"]).toBe("Bearer access_123");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.test.com/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "admin@test.com", password: "password123" }),
      })
    );
  });

  it("reuses token on subsequent calls without re-logging in", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        accessToken: "access_123",
        refreshToken: "refresh_456",
      }),
    });

    const auth = new UserLoginAuth("https://api.test.com", "admin@test.com", "password123", "test-org");
    await auth.getHeaders();
    await auth.getHeaders();

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("refreshes token on onUnauthorized", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ accessToken: "access_old", refreshToken: "refresh_456" }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ accessToken: "access_new", refreshToken: "refresh_789" }),
    });

    const auth = new UserLoginAuth("https://api.test.com", "admin@test.com", "password123", "test-org");
    await auth.getHeaders();
    const refreshed = await auth.onUnauthorized();

    expect(refreshed).toBe(true);
    const headers = await auth.getHeaders();
    expect(headers["Authorization"]).toBe("Bearer access_new");
  });

  it("re-logins if refresh fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ accessToken: "access_old", refreshToken: "refresh_456" }),
    });
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ accessToken: "access_relogin", refreshToken: "refresh_new" }),
    });

    const auth = new UserLoginAuth("https://api.test.com", "admin@test.com", "password123", "test-org");
    await auth.getHeaders();
    const refreshed = await auth.onUnauthorized();

    expect(refreshed).toBe(true);
    const headers = await auth.getHeaders();
    expect(headers["Authorization"]).toBe("Bearer access_relogin");
  });

  it("throws on initial login failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: "Invalid credentials" }),
    });

    const auth = new UserLoginAuth("https://api.test.com", "admin@test.com", "wrong-password", "test-org");
    await expect(auth.getHeaders()).rejects.toThrow("Login failed");
  });
});
