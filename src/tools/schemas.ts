// Action lists for the tools whose surface is pinned by tests/tools/schemas.test.ts.
// Kept in a module with no side effects so a test can import them without
// starting the server. src/index.ts builds its z.enum(...) from these constants.

export const FINANCES_ACTIONS = [
  "family_balance",
  "event_revenue",
  "transactions",
  "list_settlement_templates",
  "get_settlement_template",
] as const;

export const NOTIFICATIONS_ACTIONS = ["list", "send"] as const;
