# StandShare MCP Server — Design Spec

**Date:** 2026-04-10
**Status:** Draft
**Author:** Jason Carter + Claude

## Overview

A TypeScript MCP (Model Context Protocol) stdio server that exposes the StandShare API as composable, intent-friendly domain tools. Designed as a dumb-but-rich data layer with zero AI/LLM at the MCP layer — all reasoning happens in the client's Claude instance (Claude Desktop, Claude Code, or any MCP client).

### Goals

- Let org admins, coordinators, and support staff interact with StandShare data through natural language via any MCP client
- Expose composable domain tools that Claude can chain into multi-step intents
- Support historical data migration as a first-class use case
- Return human-readable formatted text, not raw JSON
- Keep the server stateless and cost-free (no LLM calls)

### Non-Goals

- No AI/LLM processing at the MCP layer
- No OAuth provider flow (auth is outbound only — server authenticates to the StandShare API)
- No remote/HTTP transport — stdio only
- No settlement template management (UI only)
- No document/compliance creation (Tier 3)

## Architecture

```
+-------------------+     stdio      +--------------------+     HTTPS     +-------------------+
|  Claude Desktop   |<-------------->|  standshare-mcp    |-------------->|  StandShare API   |
|  Claude Code      |   JSON-RPC     |                    |  Bearer auth  |  (Fastify)        |
|  Any MCP Client   |                |  No AI / No LLM    |               |                   |
+-------------------+                +--------------------+               +-------------------+
```

### Key Principles

- **No AI at the MCP layer** — pure data access and formatting
- **Stdio transport only** — runs locally, no network server to secure
- **Composable domain tools** — Claude composes multi-step intents from rich primitives
- **Human-readable responses** — formatted text so Claude can relay results naturally
- **Dual auth** — API token preferred, user login as fallback
- **Single environment** — one `STANDSHARE_API_URL` per MCP server instance

### Project Structure

```
standshare-mcp/
├── src/
│   ├── index.ts              # Entry point, server setup, transport
│   ├── auth/
│   │   ├── api-token.ts      # API token auth strategy
│   │   ├── user-login.ts     # Email/password JWT auth with refresh
│   │   └── client.ts         # HTTP client with auth injection
│   ├── tools/
│   │   ├── events.ts         # Event domain tool
│   │   ├── families.ts       # Family domain tool
│   │   ├── users.ts          # User domain tool
│   │   ├── venues.ts         # Venue domain tool
│   │   ├── finances.ts       # Financial/ledger domain tool
│   │   ├── workers.ts        # Worker assignments domain tool
│   │   ├── notifications.ts  # Notifications & announcements tool
│   │   └── reports.ts        # Dashboard & reports tool
│   ├── formatters/           # Response -> human-readable text
│   ├── resources/
│   │   └── guide.md          # Domain knowledge resource for Claude
│   └── types/                # Shared TypeScript types
├── package.json
├── tsconfig.json
└── .env.example
```

## Authentication

### Strategy Resolution (startup)

The server resolves auth strategy once at startup based on env vars:

1. If `STANDSHARE_API_TOKEN` is set → API token auth
2. Else if `STANDSHARE_EMAIL` + `STANDSHARE_PASSWORD` are set → user login auth
3. Else → fail fast with clear error message

### API Token Auth

- Stateless — every request sends `Authorization: Bearer ss_live_...`
- Token is org-scoped with RBAC and rate limiting built into the StandShare API
- Simplest path, recommended for most users

### User Login Auth

- On startup, call `POST /auth/login` with email/password to get access + refresh tokens
- Store tokens in memory only (never written to disk)
- Auto-refresh when access token expires (detect 401, use refresh token via `POST /auth/refresh`)
- If refresh fails, re-login with stored credentials
- Supports full user RBAC (permissions match the logged-in user)

### HTTP Client

Wraps `fetch` with:

- Auth header injection from whichever strategy is active
- `X-Tenant-Slug` header from `STANDSHARE_TENANT_SLUG` env var (required for org-scoped requests)
- Error normalization — API errors mapped to MCP error format
- No automatic retries (let Claude decide whether to retry on failure)

### Environment Variables

```bash
# Required
STANDSHARE_API_URL=https://api.dev.standshare.app
STANDSHARE_TENANT_SLUG=westlake

# Option A: API token (recommended)
STANDSHARE_API_TOKEN=ss_live_abc123...

# Option B: User credentials
STANDSHARE_EMAIL=admin@example.com
STANDSHARE_PASSWORD=...
```

## Tool Definitions

### Design Approach

- **8 domain-scoped tools** with an `action` parameter per tool
- **~35 actions** across all tools covering Tier 1 functionality
- Each tool maps to a StandShare domain, not a raw API endpoint
- Claude composes multi-step intents by chaining tool calls
- Tier 2/3 expansion adds actions to existing tools, not new tools

### `events`

Event lifecycle management — search, view, create, and configure events.

| Action | Description | Key Params |
|--------|-------------|------------|
| `search` | Find events by name, venue, date range, status | `query`, `venueId`, `dateFrom`, `dateTo`, `status` |
| `get` | Full event details including stands and assignment counts | `eventId` |
| `create` | Create a new event | `name`, `venueId`, `date`, `maxWorkers`, `perPersonRate`, `waitlistEnabled`, `fundDistributionEnabled` |
| `update` | Update event details | `eventId` + fields to change |
| `add_stand` | Add a stand/station to an event | `eventId`, `standNumber`, `maxWorkers` |

### `families`

Family unit management — search, view, create, and manage membership.

| Action | Description | Key Params |
|--------|-------------|------------|
| `search` | Find families by name, program, status | `query`, `program`, `status` |
| `get` | Family details with members, balance, compliance summary | `familyId` |
| `create` | Create a new family | `familyName`, `primaryContactUserId`, `program` |
| `add_member` | Associate a user with a family | `familyId`, `userId`, `role` |

### `users`

User account management — search, view, create, and invite users.

| Action | Description | Key Params |
|--------|-------------|------------|
| `search` | Find users by name, email, role | `query`, `role`, `status` |
| `get` | User details with org roles, family associations | `userId` |
| `create` | Create a new user account | `email`, `firstName`, `lastName` |
| `invite` | Send invitation to join org | `email`, `firstName`, `lastName`, `role` |

### `venues`

Venue lookup — read-only access to venue data.

| Action | Description | Key Params |
|--------|-------------|------------|
| `search` | Find venues by name, city, state | `query`, `city`, `state` |
| `get` | Venue details with upcoming events | `venueId` |

### `finances`

Financial data — balances, transactions, settlement, and historical data loading.

| Action | Description | Key Params |
|--------|-------------|------------|
| `family_balance` | Get family account balance and recent transactions | `familyId`, `limit` |
| `event_revenue` | Financial summary for an event or set of events | `eventId`, `venueId`, `dateFrom`, `dateTo` |
| `transactions` | Search transaction history | `familyId`, `type`, `dateFrom`, `dateTo` |
| `settle_event` | Run settlement for an event using a template | `eventId`, `settlementTemplateId` |
| `record_settlement` | Record a historical settlement with known amounts (data import) | `eventId`, `stands: [{ standNumber, totalCommission, ccTips, workerCount }]` |
| `credit_account` | Apply a credit/debit to a family account (historical balance loading) | `familyId`, `amount`, `type`, `description`, `date` |
| `record_scholarship` | Record a historical scholarship (data import) | `familyId`, `amount`, `status`, `date` |
| `list_settlement_templates` | List available settlement templates (read-only) | (none) |
| `get_settlement_template` | Get template details with line items | `templateId` |

### `workers`

Worker assignment and availability — manage who works which events.

| Action | Description | Key Params |
|--------|-------------|------------|
| `event_roster` | Get worker assignments for an event | `eventId`, `status` |
| `assign` | Assign a worker to an event/stand | `eventId`, `userId`, `familyId`, `standId` |
| `update_assignment` | Update assignment status (attendance, registration) | `assignmentId`, `attendanceStatus`, `registrationStatus` |
| `availability` | Find workers not assigned to an event, optionally ranked by attendance history | `eventId`, `rankByHistory` |
| `attendance_history` | Get a worker's past attendance record | `userId`, `dateFrom`, `dateTo` |

### `notifications`

Messaging and announcements — send notifications and messages to users.

| Action | Description | Key Params |
|--------|-------------|------------|
| `send` | Send a notification or message to a user | `userId`, `title`, `message` |
| `list` | List recent notifications | `userId`, `unreadOnly` |
| `announce` | Send an announcement to the org | `title`, `message` |

### `reports`

Dashboards and reports — read-only organizational insights.

| Action | Description | Key Params |
|--------|-------------|------------|
| `dashboard` | Org admin dashboard summary | (none — returns current state) |
| `financial_summary` | Financial report for date range | `dateFrom`, `dateTo` |
| `compliance_status` | Compliance overview — who's missing docs | (none or `familyId`) |

## MCP Resource: Domain Guide

The server exposes a `standshare://guide` resource containing a comprehensive domain knowledge document that MCP clients can load at conversation start.

### Content (curated from standshare-content docs)

- **What is StandShare** — Platform overview, target users (org admins, coordinators, support)
- **Entity Model** — Organization → Events → Stands → Worker Assignments; Families → Accounts → Ledger
- **Event Lifecycle** — Upcoming → Active → Completed → Settlement In Progress → Settled
- **Financial Model** — How commissions work, fund deductions (general, board, insurance), per-worker net payout calculation
- **Settlement** — Templates, line items, calculation methods
- **Worker Assignment Flow** — Registration statuses (confirmed, waitlisted, cancelled, declined), attendance statuses (assigned, confirmed, attended, no_show, cancelled)
- **Roles & Permissions** — Built-in roles, what each can do
- **Data Migration Playbook** — Load order (users → families → venues → events → stands → assignments → attendance → settlement → account credits), dependency chain, how to map from spreadsheets
- **Glossary** — Key StandShare-specific terms

### Source

Content is bundled as `src/resources/guide.md` within the MCP server package, curated from the standshare-content help center docs. Updated when significant domain changes ship.

## Response Formatting

- All tool responses are **pre-formatted text**, not raw JSON
- Lists use markdown tables or bullet points
- Financial amounts formatted with `$` and two decimal places
- Dates are human-readable (e.g., "Saturday, April 12, 2026")
- Entity references include both name and ID for chaining (e.g., "Raymond James Stadium (venue_abc123)")
- Empty results get a clear message (e.g., "No events found matching 'Cardinals' in the last 12 months")
- Large result sets are paginated with a summary count (e.g., "Showing 10 of 47 families. Use `offset` to see more.")

## Error Handling

- API errors return MCP `isError: true` format with human-readable messages
- Auth failures: "Authentication failed — check your API token or credentials in your MCP server configuration"
- Rate limit hits: include retry-after info so Claude can advise the user
- Network errors: caught and reported cleanly, no stack traces
- Validation errors: report which parameter was invalid and what's expected
- All errors use the standard MCP format:
  ```json
  {
    "content": [{ "type": "text", "text": "Error: ..." }],
    "isError": true
  }
  ```

## Claude Desktop Configuration

Users add this to their Claude Desktop MCP config:

```json
{
  "mcpServers": {
    "standshare": {
      "command": "node",
      "args": ["/path/to/standshare-mcp/build/index.js"],
      "env": {
        "STANDSHARE_API_URL": "https://api.dev.standshare.app",
        "STANDSHARE_TENANT_SLUG": "westlake",
        "STANDSHARE_API_TOKEN": "ss_live_..."
      }
    }
  }
}
```

For multiple environments, add separate entries:

```json
{
  "mcpServers": {
    "standshare-dev": {
      "command": "node",
      "args": ["/path/to/standshare-mcp/build/index.js"],
      "env": {
        "STANDSHARE_API_URL": "https://api.dev.standshare.app",
        "STANDSHARE_TENANT_SLUG": "westlake",
        "STANDSHARE_API_TOKEN": "ss_live_dev_..."
      }
    },
    "standshare-prod": {
      "command": "node",
      "args": ["/path/to/standshare-mcp/build/index.js"],
      "env": {
        "STANDSHARE_API_URL": "https://api.standshare.app",
        "STANDSHARE_TENANT_SLUG": "westlake",
        "STANDSHARE_API_TOKEN": "ss_live_prod_..."
      }
    }
  }
}
```

## Technology Stack

- **Runtime:** Node.js (ES2022)
- **Language:** TypeScript (strict mode)
- **MCP SDK:** `@modelcontextprotocol/sdk` (stdio transport)
- **Validation:** Zod (input schema validation)
- **HTTP:** Native `fetch` (no axios needed)
- **Config:** `dotenv` for environment variables
- **Build:** `tsc` → `build/` directory

## Tiering Roadmap

### Tier 1 (This Spec)

All tools and actions defined above. Covers:
- Event management (CRUD + stands)
- Family management (CRUD + members)
- User management (search, create, invite)
- Venue lookup (read-only)
- Financial data (balances, transactions, revenue, settlement, historical loading)
- Worker management (roster, assign, availability, attendance)
- Notifications (send, list, announce)
- Reports (dashboard, financial, compliance)
- Settlement templates (read-only)
- Domain guide resource

### Tier 2 (Future)

Add actions to existing tools:
- `events` — bulk operations, calendar view
- `venues` — create, update
- Branding — read and update org branding
- Compliance/document reporting — expanded compliance queries
- Worker assignments — bulk assign, swap

### Tier 3 (Future)

Add actions to existing tools:
- `finances` — full settlement workflow (reverse, adjust)
- `users` — role management, suspend, delete
- Documents — create, manage compliance requirements
- Billing, security settings
- Data import/export

## Future Considerations

- **Data Migration Skill** — A Claude Code/Desktop skill that teaches Claude the choreography for loading historical data from spreadsheets through the MCP tools (load order, field mapping, error handling)
- **Batch Operations** — If single-record creates prove too slow for large migrations, add batch variants to key tools
- **OAuth Provider** — If StandShare builds an OAuth authorization server for third-party integrations, the MCP server could adopt it for auth
- **Power Intent Tools** — If multi-step tool chains prove too slow for common workflows, add pre-composed intent tools that orchestrate multiple API calls server-side
