import { describe, it, expect } from "vitest";
import { FINANCES_ACTIONS, NOTIFICATIONS_ACTIONS } from "../../src/tools/schemas.js";

// The action lists are the public surface an AI client can reach. Pin them
// exactly: adding an action (especially one that moves money or broadcasts)
// has to be a deliberate edit to this file, not a side effect.
describe("tool action surface", () => {
  it("finances exposes only the read-only actions", () => {
    expect([...FINANCES_ACTIONS]).toEqual([
      "family_balance",
      "event_revenue",
      "transactions",
      "list_settlement_templates",
      "get_settlement_template",
    ]);
  });

  it("notifications exposes only list and send", () => {
    expect([...NOTIFICATIONS_ACTIONS]).toEqual(["list", "send"]);
  });
});
