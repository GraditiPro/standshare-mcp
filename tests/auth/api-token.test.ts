import { describe, it, expect } from "vitest";
import { ApiTokenAuth } from "../../src/auth/api-token.js";

describe("ApiTokenAuth", () => {
  it("returns Bearer header with token", async () => {
    const auth = new ApiTokenAuth("ss_live_abc123");
    const headers = await auth.getHeaders();
    expect(headers["Authorization"]).toBe("Bearer ss_live_abc123");
  });

  it("onUnauthorized returns false (no refresh possible)", async () => {
    const auth = new ApiTokenAuth("ss_live_abc123");
    expect(await auth.onUnauthorized()).toBe(false);
  });
});
