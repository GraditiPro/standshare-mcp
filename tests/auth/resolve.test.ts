import { describe, it, expect } from "vitest";
import { resolveAuth } from "../../src/auth/resolve.js";
import { ApiTokenAuth } from "../../src/auth/api-token.js";

// Every case passes an explicit env object. Never process.env: these tests
// must not depend on, or leak into, the developer's real configuration.
const SLUG = "westlake";
const TOKEN = "ss_live_test_token";

describe("resolveAuth: required settings", () => {
  it("throws when STANDSHARE_API_URL is missing", () => {
    expect(() => resolveAuth({ STANDSHARE_TENANT_SLUG: SLUG, STANDSHARE_API_TOKEN: TOKEN })).toThrow(
      /STANDSHARE_API_URL is required/
    );
  });

  it("throws when STANDSHARE_TENANT_SLUG is missing", () => {
    expect(() =>
      resolveAuth({ STANDSHARE_API_URL: "https://api.standshare.app", STANDSHARE_API_TOKEN: TOKEN })
    ).toThrow(/STANDSHARE_TENANT_SLUG is required/);
  });

  it("throws a clear error for an unparseable STANDSHARE_API_URL", () => {
    expect(() =>
      resolveAuth({
        STANDSHARE_API_URL: "not a url",
        STANDSHARE_TENANT_SLUG: SLUG,
        STANDSHARE_API_TOKEN: TOKEN,
      })
    ).toThrow(/STANDSHARE_API_URL is not a valid URL/);
  });
});

describe("resolveAuth: credentials", () => {
  const base = { STANDSHARE_API_URL: "https://api.standshare.app", STANDSHARE_TENANT_SLUG: SLUG };

  it("refuses email and password with no API token (sign-in was removed in 1.0.1)", () => {
    expect(() =>
      resolveAuth({
        ...base,
        STANDSHARE_EMAIL: "admin@example.com",
        STANDSHARE_PASSWORD: "hunter2",
      })
    ).toThrow(/STANDSHARE_API_TOKEN is required/);
  });

  it("returns an ApiTokenAuth when an API token is set", () => {
    const resolved = resolveAuth({ ...base, STANDSHARE_API_TOKEN: TOKEN });
    expect(resolved.auth).toBeInstanceOf(ApiTokenAuth);
    expect(resolved.apiUrl).toBe("https://api.standshare.app");
    expect(resolved.tenantSlug).toBe(SLUG);
  });

  it("ignores email and password when an API token is also set", async () => {
    const resolved = resolveAuth({
      ...base,
      STANDSHARE_API_TOKEN: TOKEN,
      STANDSHARE_EMAIL: "admin@example.com",
      STANDSHARE_PASSWORD: "hunter2",
    });
    expect(resolved.auth).toBeInstanceOf(ApiTokenAuth);
    expect(await resolved.auth.getHeaders()).toEqual({ Authorization: `Bearer ${TOKEN}` });
  });
});

// The host guard. 1.0.0's README showed https://api.standshare.com, a domain
// StandShare does not own. A token (or a password) configured against it goes
// to whoever runs that host. The guard must refuse BEFORE any credential is
// read or used, whichever kind of credential the environment carries.
describe("resolveAuth: host guard", () => {
  const withUrl = (url: string, extra: Record<string, string> = {}) => ({
    STANDSHARE_API_URL: url,
    STANDSHARE_TENANT_SLUG: SLUG,
    STANDSHARE_API_TOKEN: TOKEN,
    ...extra,
  });

  describe("refuses hosts StandShare does not own", () => {
    it.each([
      ["the .com host the old README showed", "https://api.standshare.com"],
      ["the bare .com domain", "https://standshare.com"],
      ["the .com host in upper case", "https://API.STANDSHARE.COM"],
      ["the .com host with a trailing dot", "https://api.standshare.com./"],
      ["the .com host with a port", "https://api.standshare.com:8443"],
      ["a lookalike suffix (notstandshare.app)", "https://notstandshare.app"],
      ["a StandShare name used as a subdomain of another domain", "https://api.standshare.app.evil.example"],
      ["a StandShare name used only in the path", "https://evil.example/api.standshare.app"],
      ["a StandShare name used only as userinfo", "https://api.standshare.app@evil.example"],
      ["an arbitrary host", "https://evil.example"],
    ])("%s (%s)", (_label, url) => {
      expect(() => resolveAuth(withUrl(url))).toThrow(/is not a StandShare host/);
    });

    it("says StandShare does not own standshare.com, and how to revoke and reissue", () => {
      let message = "";
      try {
        resolveAuth(withUrl("https://api.standshare.com"));
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).toMatch(/does not own/);
      expect(message).toContain("https://api.standshare.app");
      expect(message).toMatch(/revoke/i);
      expect(message).toContain("/admin/org-settings/api-keys");
      expect(message).toMatch(/change that password/);
    });
  });

  describe("refuses before touching any credential", () => {
    it("checks the host before the tenant slug", () => {
      expect(() => resolveAuth({ STANDSHARE_API_URL: "https://api.standshare.com" })).toThrow(
        /does not own/
      );
    });

    it("refuses email and password sent to the .com host, rather than asking for a token", () => {
      expect(() =>
        resolveAuth({
          STANDSHARE_API_URL: "https://api.standshare.com",
          STANDSHARE_TENANT_SLUG: SLUG,
          STANDSHARE_EMAIL: "admin@example.com",
          STANDSHARE_PASSWORD: "hunter2",
        })
      ).toThrow(/does not own/);
    });
  });

  describe("accepts StandShare hosts", () => {
    it.each([
      ["production", "https://api.standshare.app"],
      ["dev", "https://api.dev.standshare.app"],
      ["the apex", "https://standshare.app"],
      ["a mixed-case host", "https://API.StandShare.APP"],
    ])("%s (%s)", (_label, url) => {
      const resolved = resolveAuth(withUrl(url));
      expect(resolved.auth).toBeInstanceOf(ApiTokenAuth);
      expect(resolved.apiUrl).toBe(url);
    });

    // Local development against a local API, and the stdio smoke test that
    // points at a closed loopback port to list tools without a real server.
    it.each([
      ["localhost", "http://localhost:3001"],
      ["IPv4 loopback", "http://127.0.0.1:9"],
      ["IPv6 loopback", "http://[::1]:3001"],
    ])("%s (%s)", (_label, url) => {
      expect(resolveAuth(withUrl(url)).auth).toBeInstanceOf(ApiTokenAuth);
    });
  });
});
