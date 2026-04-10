# StandShare MCP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript stdio MCP server that exposes the StandShare API as 8 composable domain tools with ~35 actions, plus a domain guide resource.

**Architecture:** Stdio MCP server using `@modelcontextprotocol/sdk`. Dual auth (API token or user login). 8 domain-scoped tools with action parameters. Human-readable text responses. Domain guide as MCP resource.

**Tech Stack:** TypeScript, Node.js ES2022, `@modelcontextprotocol/sdk`, Zod, `dotenv`, native `fetch`

**Spec:** `docs/superpowers/specs/2026-04-10-standshare-mcp-server-design.md`

**StandShare API Reference:** `../standshare/packages/api/src/` (routes, modules, schemas, OpenAPI)

---

## File Structure

```
standshare-mcp/
├── src/
│   ├── index.ts                  # Entry point — server setup, tool/resource registration, transport
│   ├── auth/
│   │   ├── api-token.ts          # API token auth strategy (stateless Bearer header)
│   │   ├── user-login.ts         # User login auth strategy (JWT + auto-refresh)
│   │   └── client.ts             # HTTP client — auth injection, tenant header, error normalization
│   ├── tools/
│   │   ├── events.ts             # events tool — search, get, create, update, add_stand
│   │   ├── families.ts           # families tool — search, get, create, add_member
│   │   ├── users.ts              # users tool — search, get, create, invite
│   │   ├── venues.ts             # venues tool — search, get
│   │   ├── finances.ts           # finances tool — balances, transactions, settlement, templates
│   │   ├── workers.ts            # workers tool — roster, assign, update, availability, history
│   │   ├── notifications.ts      # notifications tool — send, list, announce
│   │   └── reports.ts            # reports tool — dashboard, financial_summary, compliance_status
│   ├── formatters/
│   │   ├── index.ts              # Shared formatting helpers (dates, currency, tables, entity refs)
│   │   └── pagination.ts         # Pagination summary formatting
│   ├── resources/
│   │   └── guide.md              # Domain knowledge resource content
│   └── types/
│       └── index.ts              # Shared types (AuthStrategy, ApiResponse, ToolResult)
├── tests/
│   ├── auth/
│   │   ├── api-token.test.ts
│   │   ├── user-login.test.ts
│   │   └── client.test.ts
│   ├── tools/
│   │   ├── events.test.ts
│   │   ├── families.test.ts
│   │   ├── users.test.ts
│   │   ├── venues.test.ts
│   │   ├── finances.test.ts
│   │   ├── workers.test.ts
│   │   ├── notifications.test.ts
│   │   └── reports.test.ts
│   └── formatters/
│       └── index.test.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── .env.example
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `src/index.ts` (minimal — just boots the server)

- [ ] **Step 1: Initialize package.json**

```bash
cd /Users/jasoncarter/code/standshare-mcp
npm init -y
```

Then update `package.json` to:

```json
{
  "name": "standshare-mcp",
  "version": "1.0.0",
  "description": "MCP server for StandShare API — composable domain tools for org admins, coordinators, and support staff",
  "type": "module",
  "main": "build/index.js",
  "bin": {
    "standshare-mcp": "build/index.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node build/index.js",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "license": "UNLICENSED",
  "private": true
}
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @modelcontextprotocol/sdk zod dotenv
npm install -D typescript vitest @types/node
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./build",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "build", "tests"]
}
```

- [ ] **Step 4: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 5: Create .env.example**

```bash
# Required
STANDSHARE_API_URL=https://api.dev.standshare.app
STANDSHARE_TENANT_SLUG=westlake

# Option A: API token (recommended)
STANDSHARE_API_TOKEN=ss_live_abc123...

# Option B: User credentials (fallback)
# STANDSHARE_EMAIL=admin@example.com
# STANDSHARE_PASSWORD=your-password
```

- [ ] **Step 6: Create .gitignore**

```
node_modules/
build/
.env
*.tsbuildinfo
```

- [ ] **Step 7: Create minimal src/index.ts**

```typescript
#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";

dotenv.config();

const server = new McpServer({
  name: "standshare-mcp",
  version: "1.0.0",
  description:
    "StandShare API tools for managing events, families, users, venues, finances, workers, notifications, and reports",
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
```

- [ ] **Step 8: Build and verify**

```bash
npm run build
```

Expected: Clean compile, `build/index.js` exists.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts .env.example .gitignore src/index.ts
git commit -m "chore: scaffold standshare-mcp project with TypeScript, MCP SDK, and vitest"
```

---

## Task 2: Shared Types and Formatters

**Files:**
- Create: `src/types/index.ts`
- Create: `src/formatters/index.ts`
- Create: `src/formatters/pagination.ts`
- Create: `tests/formatters/index.test.ts`

- [ ] **Step 1: Write formatter tests**

Create `tests/formatters/index.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatEntityRef,
  formatTable,
  formatList,
} from "../../src/formatters/index.js";
import { formatPagination } from "../../src/formatters/pagination.js";

describe("formatCurrency", () => {
  it("formats positive amounts", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats negative amounts", () => {
    expect(formatCurrency(-50)).toBe("-$50.00");
  });
});

describe("formatDate", () => {
  it("formats ISO date to readable format", () => {
    const result = formatDate("2026-04-12T14:00:00Z");
    expect(result).toContain("April");
    expect(result).toContain("12");
    expect(result).toContain("2026");
  });

  it("handles date-only strings", () => {
    const result = formatDate("2026-04-12");
    expect(result).toContain("April");
    expect(result).toContain("12");
  });
});

describe("formatEntityRef", () => {
  it("formats name with ID", () => {
    expect(formatEntityRef("Raymond James Stadium", "venue_abc123")).toBe(
      "Raymond James Stadium (venue_abc123)"
    );
  });
});

describe("formatTable", () => {
  it("renders markdown table", () => {
    const rows = [
      { Name: "Alice", Role: "Admin" },
      { Name: "Bob", Role: "Worker" },
    ];
    const result = formatTable(rows);
    expect(result).toContain("| Name | Role |");
    expect(result).toContain("| Alice | Admin |");
    expect(result).toContain("| Bob | Worker |");
    expect(result).toContain("|---");
  });

  it("returns empty message for no rows", () => {
    expect(formatTable([])).toBe("No results.");
  });
});

describe("formatList", () => {
  it("renders bullet list", () => {
    const result = formatList(["one", "two", "three"]);
    expect(result).toBe("- one\n- two\n- three");
  });

  it("returns empty message for no items", () => {
    expect(formatList([])).toBe("No results.");
  });
});

describe("formatPagination", () => {
  it("formats pagination summary", () => {
    const result = formatPagination({ page: 1, limit: 10, total: 47 });
    expect(result).toBe("Showing 1-10 of 47. Use `page: 2` to see more.");
  });

  it("formats last page", () => {
    const result = formatPagination({ page: 5, limit: 10, total: 47 });
    expect(result).toBe("Showing 41-47 of 47.");
  });

  it("formats single page", () => {
    const result = formatPagination({ page: 1, limit: 25, total: 5 });
    expect(result).toBe("Showing all 5 results.");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/formatters/index.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Create src/types/index.ts**

```typescript
export interface AuthStrategy {
  getHeaders(): Promise<Record<string, string>>;
  /** Called on 401 to attempt token refresh. Returns true if refresh succeeded. */
  onUnauthorized(): Promise<boolean>;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
}

export interface ApiResponse<T = unknown> {
  data: T;
  pagination?: PaginationInfo;
}

export interface ToolSuccess {
  content: Array<{ type: "text"; text: string }>;
}

export interface ToolError {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
}

export type ToolResult = ToolSuccess | ToolError;

export function toolSuccess(text: string): ToolSuccess {
  return { content: [{ type: "text", text }] };
}

export function toolError(message: string): ToolError {
  return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}
```

- [ ] **Step 4: Create src/formatters/index.ts**

```typescript
export function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (amount < 0) return `-$${formatted}`;
  return `$${formatted}`;
}

export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatEntityRef(name: string, id: string): string {
  return `${name} (${id})`;
}

export function formatTable(rows: Array<Record<string, string>>): string {
  if (rows.length === 0) return "No results.";

  const headers = Object.keys(rows[0]);
  const headerRow = `| ${headers.join(" | ")} |`;
  const separator = `|${headers.map(() => "---").join("|")}|`;
  const dataRows = rows
    .map((row) => `| ${headers.map((h) => row[h] ?? "").join(" | ")} |`)
    .join("\n");

  return `${headerRow}\n${separator}\n${dataRows}`;
}

export function formatList(items: string[]): string {
  if (items.length === 0) return "No results.";
  return items.map((item) => `- ${item}`).join("\n");
}
```

- [ ] **Step 5: Create src/formatters/pagination.ts**

```typescript
import type { PaginationInfo } from "../types/index.js";

export function formatPagination(pagination: PaginationInfo): string {
  const { page, limit, total } = pagination;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  if (total <= limit) {
    return `Showing all ${total} results.`;
  }

  if (end >= total) {
    return `Showing ${start}-${end} of ${total}.`;
  }

  return `Showing ${start}-${end} of ${total}. Use \`page: ${page + 1}\` to see more.`;
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run tests/formatters/index.test.ts
```

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/types/ src/formatters/ tests/formatters/
git commit -m "feat: add shared types, currency/date/table formatters, and pagination"
```

---

## Task 3: HTTP Client with Auth Strategies

**Files:**
- Create: `src/auth/api-token.ts`
- Create: `src/auth/user-login.ts`
- Create: `src/auth/client.ts`
- Create: `tests/auth/api-token.test.ts`
- Create: `tests/auth/user-login.test.ts`
- Create: `tests/auth/client.test.ts`

- [ ] **Step 1: Write API token auth tests**

Create `tests/auth/api-token.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/auth/api-token.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement ApiTokenAuth**

Create `src/auth/api-token.ts`:

```typescript
import type { AuthStrategy } from "../types/index.js";

export class ApiTokenAuth implements AuthStrategy {
  constructor(private token: string) {}

  async getHeaders(): Promise<Record<string, string>> {
    return { Authorization: `Bearer ${this.token}` };
  }

  async onUnauthorized(): Promise<boolean> {
    return false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/auth/api-token.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write user login auth tests**

Create `tests/auth/user-login.test.ts`:

```typescript
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

    const auth = new UserLoginAuth(
      "https://api.test.com",
      "admin@test.com",
      "password123",
      "test-org"
    );
    await auth.getHeaders();
    await auth.getHeaders();

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("refreshes token on onUnauthorized", async () => {
    // Initial login
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        accessToken: "access_old",
        refreshToken: "refresh_456",
      }),
    });
    // Refresh call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        accessToken: "access_new",
        refreshToken: "refresh_789",
      }),
    });

    const auth = new UserLoginAuth(
      "https://api.test.com",
      "admin@test.com",
      "password123",
      "test-org"
    );
    await auth.getHeaders();
    const refreshed = await auth.onUnauthorized();

    expect(refreshed).toBe(true);
    const headers = await auth.getHeaders();
    expect(headers["Authorization"]).toBe("Bearer access_new");
  });

  it("re-logins if refresh fails", async () => {
    // Initial login
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        accessToken: "access_old",
        refreshToken: "refresh_456",
      }),
    });
    // Refresh fails
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
    // Re-login
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        accessToken: "access_relogin",
        refreshToken: "refresh_new",
      }),
    });

    const auth = new UserLoginAuth(
      "https://api.test.com",
      "admin@test.com",
      "password123",
      "test-org"
    );
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

    const auth = new UserLoginAuth(
      "https://api.test.com",
      "admin@test.com",
      "wrong-password",
      "test-org"
    );

    await expect(auth.getHeaders()).rejects.toThrow("Login failed");
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

```bash
npx vitest run tests/auth/user-login.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 7: Implement UserLoginAuth**

Create `src/auth/user-login.ts`:

```typescript
import type { AuthStrategy } from "../types/index.js";

export class UserLoginAuth implements AuthStrategy {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(
    private apiUrl: string,
    private email: string,
    private password: string,
    private tenantSlug: string
  ) {}

  async getHeaders(): Promise<Record<string, string>> {
    if (!this.accessToken) {
      await this.login();
    }
    return { Authorization: `Bearer ${this.accessToken}` };
  }

  async onUnauthorized(): Promise<boolean> {
    if (this.refreshToken) {
      const refreshed = await this.refresh();
      if (refreshed) return true;
    }
    try {
      await this.login();
      return true;
    } catch {
      return false;
    }
  }

  private async login(): Promise<void> {
    const response = await fetch(`${this.apiUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-Slug": this.tenantSlug,
      },
      body: JSON.stringify({ email: this.email, password: this.password }),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }

    const data = await response.json();
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
  }

  private async refresh(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-Slug": this.tenantSlug,
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      this.accessToken = data.accessToken;
      this.refreshToken = data.refreshToken;
      return true;
    } catch {
      return false;
    }
  }
}
```

- [ ] **Step 8: Run test to verify it passes**

```bash
npx vitest run tests/auth/user-login.test.ts
```

Expected: PASS.

- [ ] **Step 9: Write HTTP client tests**

Create `tests/auth/client.test.ts`:

```typescript
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

    // First call returns 401
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: "Token expired" }),
    });
    // Retry succeeds
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

    await expect(client.get("/events")).rejects.toThrow(
      "Authentication failed"
    );
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
```

- [ ] **Step 10: Run test to verify it fails**

```bash
npx vitest run tests/auth/client.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 11: Implement StandShareClient**

Create `src/auth/client.ts`:

```typescript
import type { AuthStrategy } from "../types/index.js";

export class StandShareClient {
  constructor(
    private apiUrl: string,
    private tenantSlug: string,
    private auth: AuthStrategy
  ) {}

  async get<T = unknown>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    const url = this.buildUrl(path, params);
    return this.request<T>("GET", url);
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>("POST", url, body);
  }

  async put<T = unknown>(path: string, body?: unknown): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>("PUT", url, body);
  }

  async patch<T = unknown>(path: string, body?: unknown): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>("PATCH", url, body);
  }

  private buildUrl(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): string {
    const url = new URL(path, this.apiUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private async request<T>(method: string, url: string, body?: unknown): Promise<T> {
    const authHeaders = await this.auth.getHeaders();
    const headers: Record<string, string> = {
      ...authHeaders,
      "X-Tenant-Slug": this.tenantSlug,
    };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (response.ok) {
      return response.json() as Promise<T>;
    }

    // Handle 401 — try refresh and retry once
    if (response.status === 401) {
      const refreshed = await this.auth.onUnauthorized();
      if (refreshed) {
        const retryHeaders = await this.auth.getHeaders();
        const retryResponse = await fetch(url, {
          method,
          headers: {
            ...retryHeaders,
            "X-Tenant-Slug": this.tenantSlug,
            ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
          },
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });

        if (retryResponse.ok) {
          return retryResponse.json() as Promise<T>;
        }
      }

      throw new Error(
        "Authentication failed — check your API token or credentials in your MCP server configuration"
      );
    }

    // All other errors
    let message: string;
    try {
      const errorBody = await response.json() as { message?: string };
      message = errorBody.message ?? `API error: ${response.status}`;
    } catch {
      message = `API error: ${response.status}`;
    }
    throw new Error(message);
  }
}
```

- [ ] **Step 12: Run all auth tests**

```bash
npx vitest run tests/auth/
```

Expected: All tests PASS.

- [ ] **Step 13: Commit**

```bash
git add src/auth/ tests/auth/
git commit -m "feat: add dual auth strategies (API token + user login) and HTTP client"
```

---

## Task 4: Auth Resolution in index.ts

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Update src/index.ts with auth resolution and client export**

```typescript
#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import { ApiTokenAuth } from "./auth/api-token.js";
import { UserLoginAuth } from "./auth/user-login.js";
import { StandShareClient } from "./auth/client.js";
import type { AuthStrategy } from "./types/index.js";

dotenv.config();

function resolveAuth(): { auth: AuthStrategy; apiUrl: string; tenantSlug: string } {
  const apiUrl = process.env.STANDSHARE_API_URL;
  const tenantSlug = process.env.STANDSHARE_TENANT_SLUG;

  if (!apiUrl) {
    throw new Error("STANDSHARE_API_URL is required");
  }
  if (!tenantSlug) {
    throw new Error("STANDSHARE_TENANT_SLUG is required");
  }

  const apiToken = process.env.STANDSHARE_API_TOKEN;
  if (apiToken) {
    return { auth: new ApiTokenAuth(apiToken), apiUrl, tenantSlug };
  }

  const email = process.env.STANDSHARE_EMAIL;
  const password = process.env.STANDSHARE_PASSWORD;
  if (email && password) {
    return {
      auth: new UserLoginAuth(apiUrl, email, password, tenantSlug),
      apiUrl,
      tenantSlug,
    };
  }

  throw new Error(
    "Authentication required: set STANDSHARE_API_TOKEN, or both STANDSHARE_EMAIL and STANDSHARE_PASSWORD"
  );
}

const { auth, apiUrl, tenantSlug } = resolveAuth();
const client = new StandShareClient(apiUrl, tenantSlug, auth);

const server = new McpServer({
  name: "standshare-mcp",
  version: "1.0.0",
  description:
    "StandShare API tools for managing events, families, users, venues, finances, workers, notifications, and reports",
});

// Tools will be registered here in subsequent tasks

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});

export { server, client };
```

- [ ] **Step 2: Build to verify**

```bash
npm run build
```

Expected: Clean compile.

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: add auth resolution and client initialization to server entry"
```

---

## Task 5: Events Tool

**Files:**
- Create: `src/tools/events.ts`
- Create: `tests/tools/events.test.ts`

- [ ] **Step 1: Write events tool tests**

Create `tests/tools/events.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/tools/events.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement events tool**

Create `src/tools/events.ts`:

```typescript
import type { StandShareClient } from "../auth/client.js";
import type { ToolResult } from "../types/index.js";
import { toolSuccess, toolError } from "../types/index.js";
import { formatCurrency, formatDate, formatEntityRef, formatTable } from "../formatters/index.js";
import { formatPagination } from "../formatters/pagination.js";

interface EventsInput {
  action: string;
  eventId?: string;
  query?: string;
  venueId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  name?: string;
  date?: string;
  maxWorkers?: number;
  perPersonRate?: number;
  waitlistEnabled?: boolean;
  fundDistributionEnabled?: boolean;
  standNumber?: number;
  notes?: string;
  signupOpenAt?: string;
  signupCloseAt?: string;
}

export async function handleEvents(
  client: StandShareClient,
  input: EventsInput
): Promise<ToolResult> {
  try {
    switch (input.action) {
      case "search":
        return await searchEvents(client, input);
      case "get":
        return await getEvent(client, input);
      case "create":
        return await createEvent(client, input);
      case "update":
        return await updateEvent(client, input);
      case "add_stand":
        return await addStand(client, input);
      default:
        return toolError(`Unknown action: ${input.action}. Valid actions: search, get, create, update, add_stand`);
    }
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function searchEvents(client: StandShareClient, input: EventsInput): Promise<ToolResult> {
  const data = await client.get<{
    data: Array<{
      id: string;
      name: string;
      venue: string;
      date: string;
      status: string;
      maxWorkers: number;
    }>;
    pagination: { page: number; limit: number; total: number };
  }>("/events", {
    search: input.query,
    status: input.status,
    venueId: input.venueId,
    from: input.dateFrom,
    to: input.dateTo,
  });

  if (data.data.length === 0) {
    const filters = [input.query, input.status, input.dateFrom].filter(Boolean).join(", ");
    return toolSuccess(`No events found${filters ? ` matching: ${filters}` : ""}.`);
  }

  const rows = data.data.map((e) => ({
    Event: formatEntityRef(e.name, e.id),
    Venue: e.venue,
    Date: formatDate(e.date),
    Status: e.status,
    "Max Workers": String(e.maxWorkers),
  }));

  const table = formatTable(rows);
  const pagination = formatPagination(data.pagination);
  return toolSuccess(`${table}\n\n${pagination}`);
}

async function getEvent(client: StandShareClient, input: EventsInput): Promise<ToolResult> {
  if (!input.eventId) return toolError("eventId is required for get action");

  const event = await client.get<{
    id: string;
    name: string;
    venue: string;
    date: string;
    status: string;
    maxWorkers: number;
    perPersonRate?: number;
    waitlistEnabled: boolean;
    fundDistributionEnabled: boolean;
    notes?: string;
    stands?: Array<{ id: string; standNumber: number; maxWorkers: number }>;
  }>(`/events/${input.eventId}`);

  let text = `**${event.name}** (${event.id})\n`;
  text += `- Venue: ${event.venue}\n`;
  text += `- Date: ${formatDate(event.date)}\n`;
  text += `- Status: ${event.status}\n`;
  text += `- Max Workers: ${event.maxWorkers}\n`;
  if (event.perPersonRate !== undefined) {
    text += `- Per-Person Rate: ${formatCurrency(event.perPersonRate)}\n`;
  }
  text += `- Waitlist: ${event.waitlistEnabled ? "Enabled" : "Disabled"}\n`;
  text += `- Fund Distribution: ${event.fundDistributionEnabled ? "Enabled" : "Disabled"}\n`;
  if (event.notes) {
    text += `- Notes: ${event.notes}\n`;
  }

  if (event.stands && event.stands.length > 0) {
    text += `\n**Stands (${event.stands.length}):**\n`;
    const standRows = event.stands.map((s) => ({
      Stand: `Stand ${s.standNumber} (${s.id})`,
      "Max Workers": String(s.maxWorkers),
    }));
    text += formatTable(standRows);
  }

  return toolSuccess(text);
}

async function createEvent(client: StandShareClient, input: EventsInput): Promise<ToolResult> {
  if (!input.name) return toolError("name is required for create action");
  if (!input.date) return toolError("date is required for create action");

  const body: Record<string, unknown> = {
    name: input.name,
    date: input.date,
  };
  if (input.venueId) body.venueId = input.venueId;
  if (input.maxWorkers !== undefined) body.maxWorkers = input.maxWorkers;
  if (input.perPersonRate !== undefined) body.perPersonRate = input.perPersonRate;
  if (input.waitlistEnabled !== undefined) body.waitlistEnabled = input.waitlistEnabled;
  if (input.fundDistributionEnabled !== undefined) body.fundDistributionEnabled = input.fundDistributionEnabled;
  if (input.notes) body.notes = input.notes;
  if (input.signupOpenAt) body.signupOpenAt = input.signupOpenAt;
  if (input.signupCloseAt) body.signupCloseAt = input.signupCloseAt;

  const event = await client.post<{ id: string; name: string; date: string; status: string; venue?: string }>(
    "/events",
    body
  );

  let text = `Created event: **${event.name}** (${event.id})\n`;
  text += `- Date: ${formatDate(event.date)}\n`;
  text += `- Status: ${event.status}`;
  return toolSuccess(text);
}

async function updateEvent(client: StandShareClient, input: EventsInput): Promise<ToolResult> {
  if (!input.eventId) return toolError("eventId is required for update action");

  const body: Record<string, unknown> = {};
  if (input.name) body.name = input.name;
  if (input.date) body.date = input.date;
  if (input.maxWorkers !== undefined) body.maxWorkers = input.maxWorkers;
  if (input.perPersonRate !== undefined) body.perPersonRate = input.perPersonRate;
  if (input.waitlistEnabled !== undefined) body.waitlistEnabled = input.waitlistEnabled;
  if (input.fundDistributionEnabled !== undefined) body.fundDistributionEnabled = input.fundDistributionEnabled;
  if (input.notes) body.notes = input.notes;

  const event = await client.put<{ id: string; name: string }>(`/events/${input.eventId}`, body);

  return toolSuccess(`Updated event: **${event.name}** (${event.id})`);
}

async function addStand(client: StandShareClient, input: EventsInput): Promise<ToolResult> {
  if (!input.eventId) return toolError("eventId is required for add_stand action");
  if (input.standNumber === undefined) return toolError("standNumber is required for add_stand action");

  const body: Record<string, unknown> = {
    standNumber: input.standNumber,
  };
  if (input.maxWorkers !== undefined) body.maxWorkers = input.maxWorkers;

  const stand = await client.post<{ id: string; standNumber: number; maxWorkers: number }>(
    `/events/${input.eventId}/stands`,
    body
  );

  return toolSuccess(
    `Added Stand ${stand.standNumber} (${stand.id}) — max ${stand.maxWorkers} workers`
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/tools/events.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/events.ts tests/tools/events.test.ts
git commit -m "feat: add events tool with search, get, create, update, add_stand actions"
```

---

## Task 6: Families Tool

**Files:**
- Create: `src/tools/families.ts`
- Create: `tests/tools/families.test.ts`

- [ ] **Step 1: Write families tool tests**

Create `tests/tools/families.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleFamilies } from "../../src/tools/families.js";
import type { StandShareClient } from "../../src/auth/client.js";

function mockClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  } as unknown as StandShareClient;
}

describe("handleFamilies", () => {
  let client: ReturnType<typeof mockClient>;

  beforeEach(() => {
    client = mockClient();
  });

  describe("search", () => {
    it("searches families and returns formatted results", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: [
          { id: "fam_1", familyName: "Johnson", program: "Varsity", status: "active" },
          { id: "fam_2", familyName: "Smith", program: "JV", status: "active" },
        ],
        pagination: { page: 1, limit: 25, total: 2 },
      });

      const result = await handleFamilies(client, { action: "search" });

      expect(result.content[0].text).toContain("Johnson");
      expect(result.content[0].text).toContain("fam_1");
      expect(result.content[0].text).toContain("Smith");
    });
  });

  describe("get", () => {
    it("returns family details with balance", async () => {
      (client.get as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          id: "fam_1",
          familyName: "Johnson",
          program: "Varsity",
          status: "active",
          members: [
            { userId: "usr_1", firstName: "Sandra", lastName: "Johnson", role: "lead" },
            { userId: "usr_2", firstName: "Mike", lastName: "Johnson", role: "worker" },
          ],
        })
        .mockResolvedValueOnce({
          balance: 1250.75,
        });

      const result = await handleFamilies(client, { action: "get", familyId: "fam_1" });

      expect(result.content[0].text).toContain("Johnson");
      expect(result.content[0].text).toContain("$1,250.75");
      expect(result.content[0].text).toContain("Sandra");
      expect(result.content[0].text).toContain("Mike");
    });
  });

  describe("create", () => {
    it("creates family and returns confirmation", async () => {
      (client.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "fam_new",
        familyName: "Williams",
        program: "Varsity",
      });

      const result = await handleFamilies(client, {
        action: "create",
        familyName: "Williams",
        program: "Varsity",
      });

      expect(result.content[0].text).toContain("Created");
      expect(result.content[0].text).toContain("Williams");
      expect(result.content[0].text).toContain("fam_new");
    });
  });

  describe("add_member", () => {
    it("adds member and returns confirmation", async () => {
      (client.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        message: "User added to family",
      });

      const result = await handleFamilies(client, {
        action: "add_member",
        familyId: "fam_1",
        userId: "usr_3",
        role: "worker",
      });

      expect(result.content[0].text).toContain("Added");
      expect(result.content[0].text).toContain("fam_1");
    });
  });

  describe("error handling", () => {
    it("returns error for missing familyId on get", async () => {
      const result = await handleFamilies(client, { action: "get" });
      expect(result).toHaveProperty("isError", true);
    });

    it("returns error for unknown action", async () => {
      const result = await handleFamilies(client, { action: "delete" } as any);
      expect(result).toHaveProperty("isError", true);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/tools/families.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement families tool**

Create `src/tools/families.ts`:

```typescript
import type { StandShareClient } from "../auth/client.js";
import type { ToolResult } from "../types/index.js";
import { toolSuccess, toolError } from "../types/index.js";
import { formatCurrency, formatEntityRef, formatTable } from "../formatters/index.js";
import { formatPagination } from "../formatters/pagination.js";

interface FamiliesInput {
  action: string;
  familyId?: string;
  query?: string;
  program?: string;
  status?: string;
  familyName?: string;
  primaryContactUserId?: string;
  userId?: string;
  role?: string;
}

export async function handleFamilies(
  client: StandShareClient,
  input: FamiliesInput
): Promise<ToolResult> {
  try {
    switch (input.action) {
      case "search":
        return await searchFamilies(client, input);
      case "get":
        return await getFamily(client, input);
      case "create":
        return await createFamily(client, input);
      case "add_member":
        return await addMember(client, input);
      default:
        return toolError(`Unknown action: ${input.action}. Valid actions: search, get, create, add_member`);
    }
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function searchFamilies(client: StandShareClient, input: FamiliesInput): Promise<ToolResult> {
  const data = await client.get<{
    data: Array<{ id: string; familyName: string; program: string; status: string }>;
    pagination: { page: number; limit: number; total: number };
  }>("/families", {
    search: input.query,
    program: input.program,
    status: input.status,
  });

  if (data.data.length === 0) {
    return toolSuccess("No families found.");
  }

  const rows = data.data.map((f) => ({
    Family: formatEntityRef(f.familyName, f.id),
    Program: f.program || "—",
    Status: f.status,
  }));

  const table = formatTable(rows);
  const pagination = formatPagination(data.pagination);
  return toolSuccess(`${table}\n\n${pagination}`);
}

async function getFamily(client: StandShareClient, input: FamiliesInput): Promise<ToolResult> {
  if (!input.familyId) return toolError("familyId is required for get action");

  const [family, account] = await Promise.all([
    client.get<{
      id: string;
      familyName: string;
      program: string;
      status: string;
      members?: Array<{ userId: string; firstName: string; lastName: string; role: string }>;
    }>(`/families/${input.familyId}`),
    client.get<{ balance: number }>(`/families/${input.familyId}/account-statement`).catch(() => ({ balance: 0 })),
  ]);

  let text = `**${family.familyName}** (${family.id})\n`;
  text += `- Program: ${family.program || "—"}\n`;
  text += `- Status: ${family.status}\n`;
  text += `- Balance: ${formatCurrency(account.balance)}\n`;

  if (family.members && family.members.length > 0) {
    text += `\n**Members (${family.members.length}):**\n`;
    const rows = family.members.map((m) => ({
      Name: `${m.firstName} ${m.lastName} (${m.userId})`,
      Role: m.role,
    }));
    text += formatTable(rows);
  }

  return toolSuccess(text);
}

async function createFamily(client: StandShareClient, input: FamiliesInput): Promise<ToolResult> {
  if (!input.familyName) return toolError("familyName is required for create action");

  const body: Record<string, unknown> = { familyName: input.familyName };
  if (input.program) body.program = input.program;
  if (input.primaryContactUserId) body.primaryContactUserId = input.primaryContactUserId;

  const family = await client.post<{ id: string; familyName: string }>("/families", body);

  return toolSuccess(`Created family: **${family.familyName}** (${family.id})`);
}

async function addMember(client: StandShareClient, input: FamiliesInput): Promise<ToolResult> {
  if (!input.familyId) return toolError("familyId is required for add_member action");
  if (!input.userId) return toolError("userId is required for add_member action");

  const body: Record<string, unknown> = { userId: input.userId };
  if (input.role) body.role = input.role;

  await client.post(`/families/${input.familyId}/members`, body);

  return toolSuccess(`Added user ${input.userId} to family ${input.familyId}`);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/tools/families.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/families.ts tests/tools/families.test.ts
git commit -m "feat: add families tool with search, get, create, add_member actions"
```

---

## Task 7: Users Tool

**Files:**
- Create: `src/tools/users.ts`
- Create: `tests/tools/users.test.ts`

- [ ] **Step 1: Write users tool tests**

Create `tests/tools/users.test.ts`:

```typescript
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
          { id: "usr_1", email: "sandra@test.com", firstName: "Sandra", lastName: "Johnson", status: "active" },
        ],
        pagination: { page: 1, limit: 25, total: 1 },
      });

      const result = await handleUsers(client, { action: "search", query: "Sandra" });

      expect(result.content[0].text).toContain("Sandra Johnson");
      expect(result.content[0].text).toContain("usr_1");
      expect(result.content[0].text).toContain("sandra@test.com");
    });
  });

  describe("get", () => {
    it("returns user details", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "usr_1",
        email: "sandra@test.com",
        firstName: "Sandra",
        lastName: "Johnson",
        phone: "555-1234",
        status: "active",
        roles: [{ name: "Family Lead" }],
        families: [{ id: "fam_1", familyName: "Johnson" }],
      });

      const result = await handleUsers(client, { action: "get", userId: "usr_1" });

      expect(result.content[0].text).toContain("Sandra Johnson");
      expect(result.content[0].text).toContain("Family Lead");
      expect(result.content[0].text).toContain("Johnson");
    });
  });

  describe("create", () => {
    it("creates user and returns confirmation", async () => {
      (client.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "usr_new",
        email: "new@test.com",
        firstName: "New",
        lastName: "User",
      });

      const result = await handleUsers(client, {
        action: "create",
        email: "new@test.com",
        firstName: "New",
        lastName: "User",
      });

      expect(result.content[0].text).toContain("Created");
      expect(result.content[0].text).toContain("New User");
      expect(result.content[0].text).toContain("usr_new");
    });
  });

  describe("invite", () => {
    it("invites user and returns confirmation with URL", async () => {
      (client.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        invitationUrl: "https://login.standshare.app/invite/abc123",
        email: "invited@test.com",
      });

      const result = await handleUsers(client, {
        action: "invite",
        email: "invited@test.com",
        firstName: "Invited",
        lastName: "Person",
        role: "Family Worker",
      });

      expect(result.content[0].text).toContain("Invitation sent");
      expect(result.content[0].text).toContain("invited@test.com");
    });
  });

  describe("error handling", () => {
    it("returns error for missing email on create", async () => {
      const result = await handleUsers(client, { action: "create", firstName: "No", lastName: "Email" });
      expect(result).toHaveProperty("isError", true);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/tools/users.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement users tool**

Create `src/tools/users.ts`:

```typescript
import type { StandShareClient } from "../auth/client.js";
import type { ToolResult } from "../types/index.js";
import { toolSuccess, toolError } from "../types/index.js";
import { formatEntityRef, formatTable, formatList } from "../formatters/index.js";
import { formatPagination } from "../formatters/pagination.js";

interface UsersInput {
  action: string;
  userId?: string;
  query?: string;
  role?: string;
  status?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export async function handleUsers(
  client: StandShareClient,
  input: UsersInput
): Promise<ToolResult> {
  try {
    switch (input.action) {
      case "search":
        return await searchUsers(client, input);
      case "get":
        return await getUser(client, input);
      case "create":
        return await createUser(client, input);
      case "invite":
        return await inviteUser(client, input);
      default:
        return toolError(`Unknown action: ${input.action}. Valid actions: search, get, create, invite`);
    }
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function searchUsers(client: StandShareClient, input: UsersInput): Promise<ToolResult> {
  const data = await client.get<{
    data: Array<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      status: string;
    }>;
    pagination: { page: number; limit: number; total: number };
  }>("/admin/users", {
    search: input.query,
    role: input.role,
    status: input.status,
  });

  if (data.data.length === 0) {
    return toolSuccess("No users found.");
  }

  const rows = data.data.map((u) => ({
    User: formatEntityRef(`${u.firstName} ${u.lastName}`, u.id),
    Email: u.email,
    Status: u.status,
  }));

  const table = formatTable(rows);
  const pagination = formatPagination(data.pagination);
  return toolSuccess(`${table}\n\n${pagination}`);
}

async function getUser(client: StandShareClient, input: UsersInput): Promise<ToolResult> {
  if (!input.userId) return toolError("userId is required for get action");

  const user = await client.get<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    status: string;
    roles?: Array<{ name: string }>;
    families?: Array<{ id: string; familyName: string }>;
  }>(`/admin/users/${input.userId}`);

  let text = `**${user.firstName} ${user.lastName}** (${user.id})\n`;
  text += `- Email: ${user.email}\n`;
  if (user.phone) text += `- Phone: ${user.phone}\n`;
  text += `- Status: ${user.status}\n`;

  if (user.roles && user.roles.length > 0) {
    text += `- Roles: ${user.roles.map((r) => r.name).join(", ")}\n`;
  }

  if (user.families && user.families.length > 0) {
    text += `\n**Families:**\n`;
    text += formatList(user.families.map((f) => formatEntityRef(f.familyName, f.id)));
  }

  return toolSuccess(text);
}

async function createUser(client: StandShareClient, input: UsersInput): Promise<ToolResult> {
  if (!input.email) return toolError("email is required for create action");
  if (!input.firstName) return toolError("firstName is required for create action");
  if (!input.lastName) return toolError("lastName is required for create action");

  const body: Record<string, unknown> = {
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
  };
  if (input.phone) body.phone = input.phone;

  const user = await client.post<{ id: string; firstName: string; lastName: string }>(
    "/admin/users",
    body
  );

  return toolSuccess(`Created user: **${user.firstName} ${user.lastName}** (${user.id})`);
}

async function inviteUser(client: StandShareClient, input: UsersInput): Promise<ToolResult> {
  if (!input.email) return toolError("email is required for invite action");

  const body: Record<string, unknown> = { email: input.email };
  if (input.firstName) body.firstName = input.firstName;
  if (input.lastName) body.lastName = input.lastName;

  const result = await client.post<{ invitationUrl?: string; email: string }>(
    "/admin/users/invite",
    body
  );

  return toolSuccess(`Invitation sent to ${result.email}`);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/tools/users.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/users.ts tests/tools/users.test.ts
git commit -m "feat: add users tool with search, get, create, invite actions"
```

---

## Task 8: Venues Tool

**Files:**
- Create: `src/tools/venues.ts`
- Create: `tests/tools/venues.test.ts`

- [ ] **Step 1: Write venues tool tests**

Create `tests/tools/venues.test.ts`:

```typescript
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
    it("searches venues and returns formatted results", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: [
          { id: "ven_1", name: "Raymond James Stadium", city: "Tampa", state: "FL", capacity: 65000 },
        ],
        pagination: { page: 1, limit: 25, total: 1 },
      });

      const result = await handleVenues(client, { action: "search", query: "Raymond" });

      expect(result.content[0].text).toContain("Raymond James Stadium");
      expect(result.content[0].text).toContain("ven_1");
      expect(result.content[0].text).toContain("Tampa");
    });
  });

  describe("get", () => {
    it("returns venue details", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "ven_1",
        name: "Raymond James Stadium",
        address: "4201 N Dale Mabry Hwy",
        city: "Tampa",
        state: "FL",
        zip: "33607",
        capacity: 65000,
        contactPerson: "John Doe",
      });

      const result = await handleVenues(client, { action: "get", venueId: "ven_1" });

      expect(result.content[0].text).toContain("Raymond James Stadium");
      expect(result.content[0].text).toContain("4201 N Dale Mabry Hwy");
      expect(result.content[0].text).toContain("65,000");
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/tools/venues.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement venues tool**

Create `src/tools/venues.ts`:

```typescript
import type { StandShareClient } from "../auth/client.js";
import type { ToolResult } from "../types/index.js";
import { toolSuccess, toolError } from "../types/index.js";
import { formatEntityRef, formatTable } from "../formatters/index.js";
import { formatPagination } from "../formatters/pagination.js";

interface VenuesInput {
  action: string;
  venueId?: string;
  query?: string;
  city?: string;
  state?: string;
}

export async function handleVenues(
  client: StandShareClient,
  input: VenuesInput
): Promise<ToolResult> {
  try {
    switch (input.action) {
      case "search":
        return await searchVenues(client, input);
      case "get":
        return await getVenue(client, input);
      default:
        return toolError(`Unknown action: ${input.action}. Valid actions: search, get`);
    }
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function searchVenues(client: StandShareClient, input: VenuesInput): Promise<ToolResult> {
  const data = await client.get<{
    data: Array<{ id: string; name: string; city: string; state: string; capacity?: number }>;
    pagination: { page: number; limit: number; total: number };
  }>("/venues", {
    search: input.query,
    city: input.city,
    state: input.state,
  });

  if (data.data.length === 0) {
    return toolSuccess("No venues found.");
  }

  const rows = data.data.map((v) => ({
    Venue: formatEntityRef(v.name, v.id),
    Location: `${v.city}, ${v.state}`,
    Capacity: v.capacity ? v.capacity.toLocaleString() : "—",
  }));

  const table = formatTable(rows);
  const pagination = formatPagination(data.pagination);
  return toolSuccess(`${table}\n\n${pagination}`);
}

async function getVenue(client: StandShareClient, input: VenuesInput): Promise<ToolResult> {
  if (!input.venueId) return toolError("venueId is required for get action");

  const venue = await client.get<{
    id: string;
    name: string;
    address?: string;
    city: string;
    state: string;
    zip?: string;
    capacity?: number;
    contactPerson?: string;
  }>(`/venues/${input.venueId}`);

  let text = `**${venue.name}** (${venue.id})\n`;
  if (venue.address) text += `- Address: ${venue.address}\n`;
  text += `- Location: ${venue.city}, ${venue.state}`;
  if (venue.zip) text += ` ${venue.zip}`;
  text += "\n";
  if (venue.capacity) text += `- Capacity: ${venue.capacity.toLocaleString()}\n`;
  if (venue.contactPerson) text += `- Contact: ${venue.contactPerson}\n`;

  return toolSuccess(text);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/tools/venues.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/venues.ts tests/tools/venues.test.ts
git commit -m "feat: add venues tool with search and get actions"
```

---

## Task 9: Finances Tool

**Files:**
- Create: `src/tools/finances.ts`
- Create: `tests/tools/finances.test.ts`

- [ ] **Step 1: Write finances tool tests**

Create `tests/tools/finances.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleFinances } from "../../src/tools/finances.js";
import type { StandShareClient } from "../../src/auth/client.js";

function mockClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  } as unknown as StandShareClient;
}

describe("handleFinances", () => {
  let client: ReturnType<typeof mockClient>;

  beforeEach(() => {
    client = mockClient();
  });

  describe("family_balance", () => {
    it("returns formatted family balance with transactions", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        balance: 1250.75,
        transactions: [
          { id: "txn_1", type: "event_commission", amount: 150.0, date: "2026-04-01T00:00:00Z", description: "Cardinals Game" },
          { id: "txn_2", type: "fund_deduction", amount: -9.0, date: "2026-04-01T00:00:00Z", description: "General Fund 6%" },
        ],
      });

      const result = await handleFinances(client, { action: "family_balance", familyId: "fam_1" });

      expect(result.content[0].text).toContain("$1,250.75");
      expect(result.content[0].text).toContain("event_commission");
      expect(result.content[0].text).toContain("$150.00");
    });
  });

  describe("event_revenue", () => {
    it("returns event financial summary", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        totalCommission: 5000.0,
        ccTips: 250.0,
        perPersonPayments: 1500.0,
        workerCount: 20,
      });

      const result = await handleFinances(client, { action: "event_revenue", eventId: "evt_1" });

      expect(result.content[0].text).toContain("$5,000.00");
      expect(result.content[0].text).toContain("$250.00");
      expect(result.content[0].text).toContain("20");
    });
  });

  describe("list_settlement_templates", () => {
    it("returns formatted template list", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: [
          { id: "tpl_1", name: "Standard Concert", description: "Default concert template" },
          { id: "tpl_2", name: "Football Game", description: "NFL game template" },
        ],
      });

      const result = await handleFinances(client, { action: "list_settlement_templates" });

      expect(result.content[0].text).toContain("Standard Concert");
      expect(result.content[0].text).toContain("tpl_1");
      expect(result.content[0].text).toContain("Football Game");
    });
  });

  describe("settle_event", () => {
    it("commits settlement and returns confirmation", async () => {
      (client.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "run_1",
        status: "completed",
        totalDistributed: 4500.0,
        workersPaid: 18,
      });

      const result = await handleFinances(client, {
        action: "settle_event",
        eventId: "evt_1",
        settlementTemplateId: "tpl_1",
      });

      expect(result.content[0].text).toContain("Settlement completed");
      expect(result.content[0].text).toContain("$4,500.00");
      expect(result.content[0].text).toContain("18");
    });
  });

  describe("credit_account", () => {
    it("records credit and returns confirmation", async () => {
      (client.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "entry_1",
        amount: 500.0,
        entryType: "event_commission",
      });

      const result = await handleFinances(client, {
        action: "credit_account",
        familyId: "fam_1",
        amount: 500.0,
        type: "event_commission",
        description: "Historical: Cardinals Game 2025",
        date: "2025-10-15",
      });

      expect(result.content[0].text).toContain("Recorded");
      expect(result.content[0].text).toContain("$500.00");
    });
  });

  describe("record_scholarship", () => {
    it("records scholarship and returns confirmation", async () => {
      (client.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "sch_1",
        amount: 250.0,
        status: "approved",
      });

      const result = await handleFinances(client, {
        action: "record_scholarship",
        familyId: "fam_1",
        amount: 250.0,
        status: "approved",
        date: "2025-09-01",
      });

      expect(result.content[0].text).toContain("Recorded scholarship");
      expect(result.content[0].text).toContain("$250.00");
    });
  });

  describe("error handling", () => {
    it("returns error for missing familyId on family_balance", async () => {
      const result = await handleFinances(client, { action: "family_balance" });
      expect(result).toHaveProperty("isError", true);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/tools/finances.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement finances tool**

Create `src/tools/finances.ts`:

```typescript
import type { StandShareClient } from "../auth/client.js";
import type { ToolResult } from "../types/index.js";
import { toolSuccess, toolError } from "../types/index.js";
import { formatCurrency, formatDate, formatEntityRef, formatTable } from "../formatters/index.js";

interface FinancesInput {
  action: string;
  familyId?: string;
  eventId?: string;
  venueId?: string;
  dateFrom?: string;
  dateTo?: string;
  type?: string;
  limit?: number;
  settlementTemplateId?: string;
  amount?: number;
  description?: string;
  date?: string;
  status?: string;
  templateId?: string;
  stands?: Array<{ standNumber: number; totalCommission: number; ccTips: number; workerCount: number }>;
}

export async function handleFinances(
  client: StandShareClient,
  input: FinancesInput
): Promise<ToolResult> {
  try {
    switch (input.action) {
      case "family_balance":
        return await familyBalance(client, input);
      case "event_revenue":
        return await eventRevenue(client, input);
      case "transactions":
        return await transactions(client, input);
      case "settle_event":
        return await settleEvent(client, input);
      case "record_settlement":
        return await recordSettlement(client, input);
      case "credit_account":
        return await creditAccount(client, input);
      case "record_scholarship":
        return await recordScholarship(client, input);
      case "list_settlement_templates":
        return await listSettlementTemplates(client);
      case "get_settlement_template":
        return await getSettlementTemplate(client, input);
      default:
        return toolError(
          `Unknown action: ${input.action}. Valid actions: family_balance, event_revenue, transactions, settle_event, record_settlement, credit_account, record_scholarship, list_settlement_templates, get_settlement_template`
        );
    }
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function familyBalance(client: StandShareClient, input: FinancesInput): Promise<ToolResult> {
  if (!input.familyId) return toolError("familyId is required for family_balance action");

  const data = await client.get<{
    balance: number;
    transactions?: Array<{
      id: string;
      type: string;
      amount: number;
      date: string;
      description: string;
    }>;
  }>(`/families/${input.familyId}/account-statement`);

  let text = `**Balance:** ${formatCurrency(data.balance)}\n`;

  if (data.transactions && data.transactions.length > 0) {
    const rows = data.transactions.slice(0, input.limit ?? 10).map((t) => ({
      Date: formatDate(t.date),
      Type: t.type,
      Amount: formatCurrency(t.amount),
      Description: t.description,
    }));
    text += `\n**Recent Transactions:**\n${formatTable(rows)}`;
  }

  return toolSuccess(text);
}

async function eventRevenue(client: StandShareClient, input: FinancesInput): Promise<ToolResult> {
  if (!input.eventId) return toolError("eventId is required for event_revenue action");

  const data = await client.get<{
    totalCommission: number;
    ccTips: number;
    perPersonPayments?: number;
    workerCount: number;
  }>(`/events/${input.eventId}/financials`);

  let text = `**Event Financial Summary**\n`;
  text += `- Total Commission: ${formatCurrency(data.totalCommission)}\n`;
  text += `- CC Tips: ${formatCurrency(data.ccTips)}\n`;
  if (data.perPersonPayments !== undefined) {
    text += `- Per-Person Payments: ${formatCurrency(data.perPersonPayments)}\n`;
  }
  text += `- Workers: ${data.workerCount}\n`;

  const total = data.totalCommission + data.ccTips + (data.perPersonPayments ?? 0);
  text += `- **Total Revenue:** ${formatCurrency(total)}`;

  return toolSuccess(text);
}

async function transactions(client: StandShareClient, input: FinancesInput): Promise<ToolResult> {
  const params: Record<string, string | undefined> = {};
  if (input.familyId) params.accountId = input.familyId;
  if (input.type) params.type = input.type;
  if (input.dateFrom) params.startDate = input.dateFrom;
  if (input.dateTo) params.endDate = input.dateTo;

  const data = await client.get<{
    data: Array<{
      id: string;
      type: string;
      amount: number;
      date: string;
      description: string;
    }>;
  }>("/ledger/entries", params);

  if (data.data.length === 0) {
    return toolSuccess("No transactions found.");
  }

  const rows = data.data.map((t) => ({
    Date: formatDate(t.date),
    Type: t.type,
    Amount: formatCurrency(t.amount),
    Description: t.description,
  }));

  return toolSuccess(formatTable(rows));
}

async function settleEvent(client: StandShareClient, input: FinancesInput): Promise<ToolResult> {
  if (!input.eventId) return toolError("eventId is required for settle_event action");

  const result = await client.post<{
    id: string;
    status: string;
    totalDistributed: number;
    workersPaid: number;
  }>(`/events/${input.eventId}/settlement/commit`, {
    settlementTemplateId: input.settlementTemplateId,
  });

  return toolSuccess(
    `Settlement completed (${result.id})\n- Distributed: ${formatCurrency(result.totalDistributed)}\n- Workers paid: ${result.workersPaid}`
  );
}

async function recordSettlement(client: StandShareClient, input: FinancesInput): Promise<ToolResult> {
  if (!input.eventId) return toolError("eventId is required for record_settlement action");
  if (!input.stands || input.stands.length === 0) return toolError("stands array is required for record_settlement action");

  const result = await client.post<{ id: string }>(
    `/events/${input.eventId}/settlement/commit`,
    { stands: input.stands }
  );

  return toolSuccess(`Recorded historical settlement for event ${input.eventId} (${result.id})`);
}

async function creditAccount(client: StandShareClient, input: FinancesInput): Promise<ToolResult> {
  if (!input.familyId) return toolError("familyId is required for credit_account action");
  if (input.amount === undefined) return toolError("amount is required for credit_account action");

  const body: Record<string, unknown> = {
    accountId: input.familyId,
    amount: input.amount,
    entryType: input.type ?? "event_commission",
  };
  if (input.description) body.description = input.description;
  if (input.date) body.reference = input.date;

  const result = await client.post<{ id: string; amount: number }>("/ledger/entries", body);

  return toolSuccess(`Recorded ${formatCurrency(result.amount)} credit to family ${input.familyId}`);
}

async function recordScholarship(client: StandShareClient, input: FinancesInput): Promise<ToolResult> {
  if (!input.familyId) return toolError("familyId is required for record_scholarship action");
  if (input.amount === undefined) return toolError("amount is required for record_scholarship action");

  const body: Record<string, unknown> = {
    familyId: input.familyId,
    amount: input.amount,
  };
  if (input.status) body.status = input.status;
  if (input.date) body.submittedAt = input.date;

  const result = await client.post<{ id: string; amount: number }>("/scholarships", body);

  return toolSuccess(`Recorded scholarship of ${formatCurrency(result.amount)} for family ${input.familyId}`);
}

async function listSettlementTemplates(client: StandShareClient): Promise<ToolResult> {
  const data = await client.get<{
    data: Array<{ id: string; name: string; description?: string }>;
  }>("/settlement-templates");

  if (data.data.length === 0) {
    return toolSuccess("No settlement templates found.");
  }

  const rows = data.data.map((t) => ({
    Template: formatEntityRef(t.name, t.id),
    Description: t.description ?? "—",
  }));

  return toolSuccess(formatTable(rows));
}

async function getSettlementTemplate(client: StandShareClient, input: FinancesInput): Promise<ToolResult> {
  if (!input.templateId) return toolError("templateId is required for get_settlement_template action");

  const template = await client.get<{
    id: string;
    name: string;
    description?: string;
    rules?: Array<{ name: string; type: string; value: string }>;
  }>(`/settlement-templates/${input.templateId}`);

  let text = `**${template.name}** (${template.id})\n`;
  if (template.description) text += `${template.description}\n`;

  if (template.rules && template.rules.length > 0) {
    text += `\n**Line Items:**\n`;
    const rows = template.rules.map((r) => ({
      Name: r.name,
      Type: r.type,
      Value: r.value,
    }));
    text += formatTable(rows);
  }

  return toolSuccess(text);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/tools/finances.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/finances.ts tests/tools/finances.test.ts
git commit -m "feat: add finances tool with balance, revenue, settlement, and data import actions"
```

---

## Task 10: Workers Tool

**Files:**
- Create: `src/tools/workers.ts`
- Create: `tests/tools/workers.test.ts`

- [ ] **Step 1: Write workers tool tests**

Create `tests/tools/workers.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleWorkers } from "../../src/tools/workers.js";
import type { StandShareClient } from "../../src/auth/client.js";

function mockClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  } as unknown as StandShareClient;
}

describe("handleWorkers", () => {
  let client: ReturnType<typeof mockClient>;

  beforeEach(() => {
    client = mockClient();
  });

  describe("event_roster", () => {
    it("returns formatted roster", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: [
          {
            id: "asgn_1",
            workerName: "Sandra Johnson",
            familyName: "Johnson",
            standNumber: 1,
            registrationStatus: "confirmed",
            attendanceStatus: "assigned",
          },
          {
            id: "asgn_2",
            workerName: "Mike Johnson",
            familyName: "Johnson",
            standNumber: 2,
            registrationStatus: "confirmed",
            attendanceStatus: "attended",
          },
        ],
      });

      const result = await handleWorkers(client, { action: "event_roster", eventId: "evt_1" });

      expect(result.content[0].text).toContain("Sandra Johnson");
      expect(result.content[0].text).toContain("Mike Johnson");
      expect(result.content[0].text).toContain("confirmed");
    });
  });

  describe("assign", () => {
    it("assigns worker and returns confirmation", async () => {
      (client.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "asgn_new",
        workerName: "New Worker",
        registrationStatus: "confirmed",
      });

      const result = await handleWorkers(client, {
        action: "assign",
        eventId: "evt_1",
        userId: "usr_1",
        familyId: "fam_1",
        standId: "std_1",
      });

      expect(result.content[0].text).toContain("Assigned");
      expect(result.content[0].text).toContain("asgn_new");
    });
  });

  describe("update_assignment", () => {
    it("updates attendance status", async () => {
      (client.put as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "asgn_1",
        attendanceStatus: "attended",
      });

      const result = await handleWorkers(client, {
        action: "update_assignment",
        eventId: "evt_1",
        assignmentId: "asgn_1",
        attendanceStatus: "attended",
      });

      expect(result.content[0].text).toContain("Updated");
      expect(result.content[0].text).toContain("attended");
    });
  });

  describe("availability", () => {
    it("returns available workers", async () => {
      (client.get as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          data: [{ id: "asgn_1", userId: "usr_1" }, { id: "asgn_2", userId: "usr_2" }],
        })
        .mockResolvedValueOnce({
          data: [
            { id: "usr_1", firstName: "Sandra", lastName: "Johnson" },
            { id: "usr_2", firstName: "Mike", lastName: "Johnson" },
            { id: "usr_3", firstName: "Alice", lastName: "Smith" },
            { id: "usr_4", firstName: "Bob", lastName: "Williams" },
          ],
          pagination: { page: 1, limit: 100, total: 4 },
        });

      const result = await handleWorkers(client, {
        action: "availability",
        eventId: "evt_1",
      });

      expect(result.content[0].text).toContain("Alice Smith");
      expect(result.content[0].text).toContain("Bob Williams");
      expect(result.content[0].text).not.toContain("Sandra Johnson");
    });
  });

  describe("attendance_history", () => {
    it("returns worker history", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: [
          { eventName: "Cardinals Game", date: "2026-03-15", attendanceStatus: "attended" },
          { eventName: "USF Game", date: "2026-03-22", attendanceStatus: "attended" },
          { eventName: "Concert", date: "2026-03-29", attendanceStatus: "no_show" },
        ],
      });

      const result = await handleWorkers(client, {
        action: "attendance_history",
        userId: "usr_1",
      });

      expect(result.content[0].text).toContain("Cardinals Game");
      expect(result.content[0].text).toContain("attended");
      expect(result.content[0].text).toContain("no_show");
    });
  });

  describe("error handling", () => {
    it("returns error for missing eventId on event_roster", async () => {
      const result = await handleWorkers(client, { action: "event_roster" });
      expect(result).toHaveProperty("isError", true);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/tools/workers.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement workers tool**

Create `src/tools/workers.ts`:

```typescript
import type { StandShareClient } from "../auth/client.js";
import type { ToolResult } from "../types/index.js";
import { toolSuccess, toolError } from "../types/index.js";
import { formatDate, formatEntityRef, formatTable } from "../formatters/index.js";

interface WorkersInput {
  action: string;
  eventId?: string;
  userId?: string;
  familyId?: string;
  standId?: string;
  assignmentId?: string;
  attendanceStatus?: string;
  registrationStatus?: string;
  status?: string;
  rankByHistory?: boolean;
  dateFrom?: string;
  dateTo?: string;
  workerName?: string;
}

export async function handleWorkers(
  client: StandShareClient,
  input: WorkersInput
): Promise<ToolResult> {
  try {
    switch (input.action) {
      case "event_roster":
        return await eventRoster(client, input);
      case "assign":
        return await assignWorker(client, input);
      case "update_assignment":
        return await updateAssignment(client, input);
      case "availability":
        return await availability(client, input);
      case "attendance_history":
        return await attendanceHistory(client, input);
      default:
        return toolError(
          `Unknown action: ${input.action}. Valid actions: event_roster, assign, update_assignment, availability, attendance_history`
        );
    }
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function eventRoster(client: StandShareClient, input: WorkersInput): Promise<ToolResult> {
  if (!input.eventId) return toolError("eventId is required for event_roster action");

  const data = await client.get<{
    data: Array<{
      id: string;
      workerName: string;
      familyName?: string;
      standNumber?: number;
      registrationStatus: string;
      attendanceStatus: string;
    }>;
  }>(`/events/${input.eventId}/workers`);

  if (data.data.length === 0) {
    return toolSuccess("No workers assigned to this event.");
  }

  const rows = data.data.map((w) => ({
    Worker: `${w.workerName} (${w.id})`,
    Family: w.familyName ?? "—",
    Stand: w.standNumber ? `Stand ${w.standNumber}` : "Unassigned",
    Registration: w.registrationStatus,
    Attendance: w.attendanceStatus,
  }));

  return toolSuccess(`**Event Roster (${data.data.length} workers):**\n${formatTable(rows)}`);
}

async function assignWorker(client: StandShareClient, input: WorkersInput): Promise<ToolResult> {
  if (!input.eventId) return toolError("eventId is required for assign action");
  if (!input.familyId) return toolError("familyId is required for assign action");

  const body: Record<string, unknown> = {
    familyId: input.familyId,
  };
  if (input.userId) body.userId = input.userId;
  if (input.standId) body.standId = input.standId;
  if (input.workerName) body.workerName = input.workerName;

  const result = await client.post<{
    id: string;
    workerName?: string;
    registrationStatus: string;
  }>(`/events/${input.eventId}/workers`, body);

  return toolSuccess(
    `Assigned worker to event (${result.id}) — registration: ${result.registrationStatus}`
  );
}

async function updateAssignment(client: StandShareClient, input: WorkersInput): Promise<ToolResult> {
  if (!input.eventId) return toolError("eventId is required for update_assignment action");
  if (!input.assignmentId) return toolError("assignmentId is required for update_assignment action");

  const body: Record<string, unknown> = {};
  if (input.attendanceStatus) body.attendanceStatus = input.attendanceStatus;
  if (input.registrationStatus) body.registrationStatus = input.registrationStatus;
  if (input.standId) body.standId = input.standId;

  const result = await client.put<{
    id: string;
    attendanceStatus: string;
    registrationStatus?: string;
  }>(`/events/${input.eventId}/workers/${input.assignmentId}`, body);

  return toolSuccess(
    `Updated assignment ${result.id} — attendance: ${result.attendanceStatus}`
  );
}

async function availability(client: StandShareClient, input: WorkersInput): Promise<ToolResult> {
  if (!input.eventId) return toolError("eventId is required for availability action");

  // Get current assignments for this event
  const assignments = await client.get<{
    data: Array<{ userId: string }>;
  }>(`/events/${input.eventId}/workers`);

  const assignedUserIds = new Set(assignments.data.map((a) => a.userId));

  // Get all org users
  const users = await client.get<{
    data: Array<{ id: string; firstName: string; lastName: string }>;
    pagination: { page: number; limit: number; total: number };
  }>("/admin/users", { limit: 100, status: "active" });

  const available = users.data.filter((u) => !assignedUserIds.has(u.id));

  if (available.length === 0) {
    return toolSuccess("All active users are already assigned to this event.");
  }

  const rows = available.map((u) => ({
    User: formatEntityRef(`${u.firstName} ${u.lastName}`, u.id),
  }));

  return toolSuccess(`**Available Workers (${available.length}):**\n${formatTable(rows)}`);
}

async function attendanceHistory(client: StandShareClient, input: WorkersInput): Promise<ToolResult> {
  if (!input.userId) return toolError("userId is required for attendance_history action");

  const data = await client.get<{
    data: Array<{
      eventName: string;
      date: string;
      attendanceStatus: string;
    }>;
  }>(`/admin/worker-performance/${input.userId}`, {
    startDate: input.dateFrom,
    endDate: input.dateTo,
  });

  if (data.data.length === 0) {
    return toolSuccess("No attendance history found.");
  }

  const rows = data.data.map((h) => ({
    Event: h.eventName,
    Date: formatDate(h.date),
    Status: h.attendanceStatus,
  }));

  const attended = data.data.filter((h) => h.attendanceStatus === "attended").length;
  const total = data.data.length;
  const rate = total > 0 ? Math.round((attended / total) * 100) : 0;

  return toolSuccess(
    `**Attendance History (${attended}/${total} = ${rate}%):**\n${formatTable(rows)}`
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/tools/workers.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/workers.ts tests/tools/workers.test.ts
git commit -m "feat: add workers tool with roster, assign, update, availability, and history actions"
```

---

## Task 11: Notifications Tool

**Files:**
- Create: `src/tools/notifications.ts`
- Create: `tests/tools/notifications.test.ts`

- [ ] **Step 1: Write notifications tool tests**

Create `tests/tools/notifications.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleNotifications } from "../../src/tools/notifications.js";
import type { StandShareClient } from "../../src/auth/client.js";

function mockClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  } as unknown as StandShareClient;
}

describe("handleNotifications", () => {
  let client: ReturnType<typeof mockClient>;

  beforeEach(() => {
    client = mockClient();
  });

  describe("list", () => {
    it("returns formatted notification list", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: [
          { id: "notif_1", title: "Event Reminder", message: "Cardinals Game tomorrow", isRead: false, createdAt: "2026-04-14T10:00:00Z" },
          { id: "notif_2", title: "Balance Update", message: "Your balance increased", isRead: true, createdAt: "2026-04-13T10:00:00Z" },
        ],
      });

      const result = await handleNotifications(client, { action: "list", userId: "usr_1" });

      expect(result.content[0].text).toContain("Event Reminder");
      expect(result.content[0].text).toContain("Balance Update");
    });
  });

  describe("send", () => {
    it("sends notification and returns confirmation", async () => {
      (client.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "notif_new",
        title: "Account Balance",
      });

      const result = await handleNotifications(client, {
        action: "send",
        userId: "usr_1",
        title: "Account Balance",
        message: "Your family balance is $1,250.75",
      });

      expect(result.content[0].text).toContain("Notification sent");
    });
  });

  describe("announce", () => {
    it("sends announcement and returns confirmation", async () => {
      (client.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "ann_1",
        title: "Schedule Change",
      });

      const result = await handleNotifications(client, {
        action: "announce",
        title: "Schedule Change",
        message: "Saturday's game has been moved to 6pm",
      });

      expect(result.content[0].text).toContain("Announcement sent");
    });
  });

  describe("error handling", () => {
    it("returns error for missing userId on send", async () => {
      const result = await handleNotifications(client, { action: "send", title: "Test", message: "Test" });
      expect(result).toHaveProperty("isError", true);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/tools/notifications.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement notifications tool**

Create `src/tools/notifications.ts`:

```typescript
import type { StandShareClient } from "../auth/client.js";
import type { ToolResult } from "../types/index.js";
import { toolSuccess, toolError } from "../types/index.js";
import { formatDate, formatTable } from "../formatters/index.js";

interface NotificationsInput {
  action: string;
  userId?: string;
  title?: string;
  message?: string;
  unreadOnly?: boolean;
}

export async function handleNotifications(
  client: StandShareClient,
  input: NotificationsInput
): Promise<ToolResult> {
  try {
    switch (input.action) {
      case "list":
        return await listNotifications(client, input);
      case "send":
        return await sendNotification(client, input);
      case "announce":
        return await sendAnnouncement(client, input);
      default:
        return toolError(`Unknown action: ${input.action}. Valid actions: list, send, announce`);
    }
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function listNotifications(client: StandShareClient, input: NotificationsInput): Promise<ToolResult> {
  const params: Record<string, string | undefined> = {};
  if (input.unreadOnly) params.unreadOnly = "true";

  const data = await client.get<{
    data: Array<{
      id: string;
      title: string;
      message: string;
      isRead: boolean;
      createdAt: string;
    }>;
  }>("/my/notifications", params);

  if (data.data.length === 0) {
    return toolSuccess("No notifications.");
  }

  const rows = data.data.map((n) => ({
    Status: n.isRead ? "Read" : "**Unread**",
    Title: n.title,
    Message: n.message.length > 60 ? n.message.slice(0, 57) + "..." : n.message,
    Date: formatDate(n.createdAt),
  }));

  return toolSuccess(formatTable(rows));
}

async function sendNotification(client: StandShareClient, input: NotificationsInput): Promise<ToolResult> {
  if (!input.userId) return toolError("userId is required for send action");
  if (!input.title) return toolError("title is required for send action");
  if (!input.message) return toolError("message is required for send action");

  await client.post("/my/notifications", {
    userId: input.userId,
    title: input.title,
    message: input.message,
  });

  return toolSuccess(`Notification sent to user ${input.userId}: "${input.title}"`);
}

async function sendAnnouncement(client: StandShareClient, input: NotificationsInput): Promise<ToolResult> {
  if (!input.title) return toolError("title is required for announce action");
  if (!input.message) return toolError("message is required for announce action");

  await client.post("/announcements", {
    title: input.title,
    message: input.message,
  });

  return toolSuccess(`Announcement sent: "${input.title}"`);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/tools/notifications.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/notifications.ts tests/tools/notifications.test.ts
git commit -m "feat: add notifications tool with list, send, and announce actions"
```

---

## Task 12: Reports Tool

**Files:**
- Create: `src/tools/reports.ts`
- Create: `tests/tools/reports.test.ts`

- [ ] **Step 1: Write reports tool tests**

Create `tests/tools/reports.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleReports } from "../../src/tools/reports.js";
import type { StandShareClient } from "../../src/auth/client.js";

function mockClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  } as unknown as StandShareClient;
}

describe("handleReports", () => {
  let client: ReturnType<typeof mockClient>;

  beforeEach(() => {
    client = mockClient();
  });

  describe("dashboard", () => {
    it("returns formatted dashboard summary", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        totalEvents: 24,
        upcomingEvents: 3,
        totalFamilies: 47,
        totalWorkers: 120,
        totalEarnings: 45000.5,
        activeWorkers: 85,
      });

      const result = await handleReports(client, { action: "dashboard" });

      expect(result.content[0].text).toContain("24");
      expect(result.content[0].text).toContain("47");
      expect(result.content[0].text).toContain("$45,000.50");
    });
  });

  describe("financial_summary", () => {
    it("returns financial report for date range", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        totalRevenue: 25000.0,
        totalDistributed: 20000.0,
        totalDeductions: 5000.0,
        eventCount: 8,
      });

      const result = await handleReports(client, {
        action: "financial_summary",
        dateFrom: "2026-01-01",
        dateTo: "2026-03-31",
      });

      expect(result.content[0].text).toContain("$25,000.00");
      expect(result.content[0].text).toContain("$20,000.00");
      expect(result.content[0].text).toContain("8");
    });
  });

  describe("compliance_status", () => {
    it("returns compliance overview", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        totalFamilies: 47,
        compliant: 42,
        nonCompliant: 5,
        families: [
          { id: "fam_1", familyName: "Johnson", missingDocs: ["Contract"] },
          { id: "fam_2", familyName: "Smith", missingDocs: ["ID", "Contract"] },
        ],
      });

      const result = await handleReports(client, { action: "compliance_status" });

      expect(result.content[0].text).toContain("42");
      expect(result.content[0].text).toContain("5");
      expect(result.content[0].text).toContain("Johnson");
      expect(result.content[0].text).toContain("Contract");
    });
  });

  describe("error handling", () => {
    it("returns error for unknown action", async () => {
      const result = await handleReports(client, { action: "invalid" } as any);
      expect(result).toHaveProperty("isError", true);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/tools/reports.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement reports tool**

Create `src/tools/reports.ts`:

```typescript
import type { StandShareClient } from "../auth/client.js";
import type { ToolResult } from "../types/index.js";
import { toolSuccess, toolError } from "../types/index.js";
import { formatCurrency, formatTable, formatList } from "../formatters/index.js";

interface ReportsInput {
  action: string;
  dateFrom?: string;
  dateTo?: string;
  familyId?: string;
}

export async function handleReports(
  client: StandShareClient,
  input: ReportsInput
): Promise<ToolResult> {
  try {
    switch (input.action) {
      case "dashboard":
        return await dashboard(client);
      case "financial_summary":
        return await financialSummary(client, input);
      case "compliance_status":
        return await complianceStatus(client, input);
      default:
        return toolError(`Unknown action: ${input.action}. Valid actions: dashboard, financial_summary, compliance_status`);
    }
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function dashboard(client: StandShareClient): Promise<ToolResult> {
  const data = await client.get<{
    totalEvents: number;
    upcomingEvents: number;
    totalFamilies: number;
    totalWorkers: number;
    totalEarnings: number;
    activeWorkers: number;
  }>("/admin/dashboard");

  let text = "**Organization Dashboard**\n\n";
  text += `| Metric | Value |\n|---|---|\n`;
  text += `| Total Events | ${data.totalEvents} |\n`;
  text += `| Upcoming Events | ${data.upcomingEvents} |\n`;
  text += `| Total Families | ${data.totalFamilies} |\n`;
  text += `| Total Workers | ${data.totalWorkers} |\n`;
  text += `| Active Workers | ${data.activeWorkers} |\n`;
  text += `| Total Earnings | ${formatCurrency(data.totalEarnings)} |\n`;

  return toolSuccess(text);
}

async function financialSummary(client: StandShareClient, input: ReportsInput): Promise<ToolResult> {
  const data = await client.get<{
    totalRevenue: number;
    totalDistributed: number;
    totalDeductions: number;
    eventCount: number;
  }>("/ledger/reports/summary", {
    startDate: input.dateFrom,
    endDate: input.dateTo,
  });

  let text = "**Financial Summary**\n";
  if (input.dateFrom || input.dateTo) {
    text += `Period: ${input.dateFrom ?? "start"} to ${input.dateTo ?? "now"}\n`;
  }
  text += `\n`;
  text += `- Total Revenue: ${formatCurrency(data.totalRevenue)}\n`;
  text += `- Total Distributed: ${formatCurrency(data.totalDistributed)}\n`;
  text += `- Total Deductions: ${formatCurrency(data.totalDeductions)}\n`;
  text += `- Events: ${data.eventCount}\n`;

  return toolSuccess(text);
}

async function complianceStatus(client: StandShareClient, input: ReportsInput): Promise<ToolResult> {
  const params: Record<string, string | undefined> = {};
  if (input.familyId) params.familyId = input.familyId;

  const data = await client.get<{
    totalFamilies: number;
    compliant: number;
    nonCompliant: number;
    families?: Array<{ id: string; familyName: string; missingDocs: string[] }>;
  }>("/reports/compliance", params);

  let text = "**Compliance Status**\n\n";
  text += `- Total Families: ${data.totalFamilies}\n`;
  text += `- Compliant: ${data.compliant}\n`;
  text += `- Non-Compliant: ${data.nonCompliant}\n`;

  if (data.families && data.families.length > 0) {
    text += `\n**Families Needing Attention:**\n`;
    const rows = data.families.map((f) => ({
      Family: `${f.familyName} (${f.id})`,
      "Missing Documents": f.missingDocs.join(", "),
    }));
    text += formatTable(rows);
  }

  return toolSuccess(text);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/tools/reports.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/reports.ts tests/tools/reports.test.ts
git commit -m "feat: add reports tool with dashboard, financial_summary, and compliance_status actions"
```

---

## Task 13: Register All Tools in index.ts

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Update src/index.ts to register all 8 tools with Zod schemas**

Replace the full content of `src/index.ts`:

```typescript
#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from "dotenv";
import { ApiTokenAuth } from "./auth/api-token.js";
import { UserLoginAuth } from "./auth/user-login.js";
import { StandShareClient } from "./auth/client.js";
import type { AuthStrategy } from "./types/index.js";
import { handleEvents } from "./tools/events.js";
import { handleFamilies } from "./tools/families.js";
import { handleUsers } from "./tools/users.js";
import { handleVenues } from "./tools/venues.js";
import { handleFinances } from "./tools/finances.js";
import { handleWorkers } from "./tools/workers.js";
import { handleNotifications } from "./tools/notifications.js";
import { handleReports } from "./tools/reports.js";

dotenv.config();

function resolveAuth(): { auth: AuthStrategy; apiUrl: string; tenantSlug: string } {
  const apiUrl = process.env.STANDSHARE_API_URL;
  const tenantSlug = process.env.STANDSHARE_TENANT_SLUG;

  if (!apiUrl) throw new Error("STANDSHARE_API_URL is required");
  if (!tenantSlug) throw new Error("STANDSHARE_TENANT_SLUG is required");

  const apiToken = process.env.STANDSHARE_API_TOKEN;
  if (apiToken) return { auth: new ApiTokenAuth(apiToken), apiUrl, tenantSlug };

  const email = process.env.STANDSHARE_EMAIL;
  const password = process.env.STANDSHARE_PASSWORD;
  if (email && password) {
    return { auth: new UserLoginAuth(apiUrl, email, password, tenantSlug), apiUrl, tenantSlug };
  }

  throw new Error(
    "Authentication required: set STANDSHARE_API_TOKEN, or both STANDSHARE_EMAIL and STANDSHARE_PASSWORD"
  );
}

const { auth, apiUrl, tenantSlug } = resolveAuth();
const client = new StandShareClient(apiUrl, tenantSlug, auth);

const server = new McpServer({
  name: "standshare-mcp",
  version: "1.0.0",
  description:
    "StandShare API tools for managing events, families, users, venues, finances, workers, notifications, and reports. StandShare is a family fundraising platform where organizations manage concession stand events, assign workers, track attendance, and distribute earnings to family accounts.",
});

// --- Events Tool ---
server.tool(
  "events",
  "Manage fundraising events — search, view details, create, update, and add stands. Events are concession stand shifts at venues where families send workers to earn commissions.",
  {
    action: z.enum(["search", "get", "create", "update", "add_stand"]).describe("Action to perform"),
    eventId: z.string().optional().describe("Event ID (required for get, update, add_stand)"),
    query: z.string().optional().describe("Search by event name"),
    venueId: z.string().optional().describe("Filter by venue ID"),
    dateFrom: z.string().optional().describe("Filter events from this date (ISO 8601)"),
    dateTo: z.string().optional().describe("Filter events to this date (ISO 8601)"),
    status: z.enum(["upcoming", "active", "completed", "settled"]).optional().describe("Filter by status"),
    name: z.string().optional().describe("Event name (for create)"),
    date: z.string().optional().describe("Event date ISO 8601 (for create)"),
    maxWorkers: z.number().optional().describe("Maximum workers for the event"),
    perPersonRate: z.number().optional().describe("Per-person rate in dollars"),
    waitlistEnabled: z.boolean().optional().describe("Enable waitlist"),
    fundDistributionEnabled: z.boolean().optional().describe("Enable fund distribution"),
    standNumber: z.number().optional().describe("Stand number (for add_stand)"),
    notes: z.string().optional().describe("Event notes"),
    signupOpenAt: z.string().optional().describe("Signup open date ISO 8601"),
    signupCloseAt: z.string().optional().describe("Signup close date ISO 8601"),
  },
  async (input) => handleEvents(client, input)
);

// --- Families Tool ---
server.tool(
  "families",
  "Manage family units — search, view details with balance, create, and add members. Families are the core unit in StandShare — they send workers to events and earn commissions to their family account.",
  {
    action: z.enum(["search", "get", "create", "add_member"]).describe("Action to perform"),
    familyId: z.string().optional().describe("Family ID (required for get, add_member)"),
    query: z.string().optional().describe("Search by family name"),
    program: z.string().optional().describe("Filter by program (e.g., Varsity, JV)"),
    status: z.string().optional().describe("Filter by status"),
    familyName: z.string().optional().describe("Family name (for create)"),
    primaryContactUserId: z.string().optional().describe("Primary contact user ID (for create)"),
    userId: z.string().optional().describe("User ID to add as member"),
    role: z.string().optional().describe("Member role (lead, worker)"),
  },
  async (input) => handleFamilies(client, input)
);

// --- Users Tool ---
server.tool(
  "users",
  "Manage user accounts — search, view details with roles and family associations, create, and invite. Users are individuals who log into StandShare and may be associated with one or more families.",
  {
    action: z.enum(["search", "get", "create", "invite"]).describe("Action to perform"),
    userId: z.string().optional().describe("User ID (required for get)"),
    query: z.string().optional().describe("Search by name or email"),
    role: z.string().optional().describe("Filter by role name"),
    status: z.string().optional().describe("Filter by status"),
    email: z.string().optional().describe("Email address (required for create, invite)"),
    firstName: z.string().optional().describe("First name"),
    lastName: z.string().optional().describe("Last name"),
    phone: z.string().optional().describe("Phone number"),
  },
  async (input) => handleUsers(client, input)
);

// --- Venues Tool ---
server.tool(
  "venues",
  "Look up venues — search by name/location and view details. Venues are physical locations (stadiums, arenas) where fundraising events take place.",
  {
    action: z.enum(["search", "get"]).describe("Action to perform"),
    venueId: z.string().optional().describe("Venue ID (required for get)"),
    query: z.string().optional().describe("Search by venue name"),
    city: z.string().optional().describe("Filter by city"),
    state: z.string().optional().describe("Filter by state"),
  },
  async (input) => handleVenues(client, input)
);

// --- Finances Tool ---
server.tool(
  "finances",
  "Financial operations — view family balances, event revenue, transactions, run settlement, and record historical data. Families earn commissions from events which are distributed to their accounts after settlement.",
  {
    action: z.enum([
      "family_balance", "event_revenue", "transactions", "settle_event",
      "record_settlement", "credit_account", "record_scholarship",
      "list_settlement_templates", "get_settlement_template",
    ]).describe("Action to perform"),
    familyId: z.string().optional().describe("Family ID"),
    eventId: z.string().optional().describe("Event ID"),
    venueId: z.string().optional().describe("Venue ID for revenue filtering"),
    dateFrom: z.string().optional().describe("Start date (ISO 8601)"),
    dateTo: z.string().optional().describe("End date (ISO 8601)"),
    type: z.string().optional().describe("Transaction type filter (event_commission, fund_deduction, scholarship_payment)"),
    limit: z.number().optional().describe("Number of transactions to return"),
    settlementTemplateId: z.string().optional().describe("Settlement template ID"),
    templateId: z.string().optional().describe("Template ID (for get_settlement_template)"),
    amount: z.number().optional().describe("Dollar amount (for credit_account, record_scholarship)"),
    description: z.string().optional().describe("Description for ledger entry"),
    date: z.string().optional().describe("Date for historical records (ISO 8601)"),
    status: z.string().optional().describe("Status (for record_scholarship: pending, approved, rejected)"),
    stands: z.array(z.object({
      standNumber: z.number(),
      totalCommission: z.number(),
      ccTips: z.number(),
      workerCount: z.number(),
    })).optional().describe("Stand data array (for record_settlement)"),
  },
  async (input) => handleFinances(client, input)
);

// --- Workers Tool ---
server.tool(
  "workers",
  "Manage worker assignments — view event rosters, assign workers to events/stands, update attendance, check availability, and view attendance history. Workers are family members who work concession stands at events.",
  {
    action: z.enum(["event_roster", "assign", "update_assignment", "availability", "attendance_history"]).describe("Action to perform"),
    eventId: z.string().optional().describe("Event ID (required for event_roster, assign, update_assignment, availability)"),
    userId: z.string().optional().describe("User ID"),
    familyId: z.string().optional().describe("Family ID (required for assign)"),
    standId: z.string().optional().describe("Stand ID to assign worker to"),
    assignmentId: z.string().optional().describe("Assignment ID (required for update_assignment)"),
    attendanceStatus: z.enum(["assigned", "confirmed", "attended", "no_show", "cancelled"]).optional().describe("Attendance status"),
    registrationStatus: z.enum(["confirmed", "waitlisted", "cancelled_by_family", "declined"]).optional().describe("Registration status"),
    rankByHistory: z.boolean().optional().describe("Rank available workers by attendance history"),
    dateFrom: z.string().optional().describe("Start date for history (ISO 8601)"),
    dateTo: z.string().optional().describe("End date for history (ISO 8601)"),
    workerName: z.string().optional().describe("Worker name (for assign)"),
  },
  async (input) => handleWorkers(client, input)
);

// --- Notifications Tool ---
server.tool(
  "notifications",
  "Send and view notifications — send messages to individual users, list notifications, and broadcast announcements to the organization.",
  {
    action: z.enum(["list", "send", "announce"]).describe("Action to perform"),
    userId: z.string().optional().describe("User ID (required for send)"),
    title: z.string().optional().describe("Notification/announcement title"),
    message: z.string().optional().describe("Notification/announcement body"),
    unreadOnly: z.boolean().optional().describe("Only show unread notifications"),
  },
  async (input) => handleNotifications(client, input)
);

// --- Reports Tool ---
server.tool(
  "reports",
  "View organizational reports — admin dashboard with KPIs, financial summaries for date ranges, and compliance status showing which families are missing required documents.",
  {
    action: z.enum(["dashboard", "financial_summary", "compliance_status"]).describe("Action to perform"),
    dateFrom: z.string().optional().describe("Start date for financial_summary (ISO 8601)"),
    dateTo: z.string().optional().describe("End date for financial_summary (ISO 8601)"),
    familyId: z.string().optional().describe("Family ID for compliance_status"),
  },
  async (input) => handleReports(client, input)
);

// --- Start Server ---
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
```

- [ ] **Step 2: Build to verify**

```bash
npm run build
```

Expected: Clean compile.

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: register all 8 domain tools with Zod schemas in server entry"
```

---

## Task 14: Domain Guide Resource

**Files:**
- Create: `src/resources/guide.md`
- Modify: `src/index.ts` (add resource registration)

- [ ] **Step 1: Create the domain guide**

Create `src/resources/guide.md`:

```markdown
# StandShare Domain Guide

## What is StandShare?

StandShare is a family fundraising platform for organizations (sports booster clubs, nonprofits) that run concession stand events. Organizations sign up families who send workers to events. Workers earn commissions that are credited to their family's account. The platform handles event management, worker scheduling, financial tracking, settlement, compliance, and reporting.

## Who Uses This

- **Organization Admins** — manage the organization, events, families, users, and finances
- **Event Coordinators** — create and manage events, assign workers, handle settlement
- **Treasurers** — review financial reports, approve scholarships, manage fund balances
- **Support Staff** — look up family accounts, troubleshoot issues, answer questions

## Entity Model

```
Organization (top-level tenant)
├── Users (people with accounts)
├── Families (groups of workers)
│   ├── Family Members (users linked to a family)
│   └── Family Account (balance, transactions)
├── Events (concession stand shifts)
│   ├── Stands (physical stations at the event)
│   └── Worker Assignments (who works which stand)
├── Venues (where events happen)
└── Settlement Templates (how to calculate payouts)
```

## Event Lifecycle

1. **Upcoming** — event created, workers can sign up
2. **Active** — event day, check-in happening
3. **Completed** — event done, financial data entered
4. **Settlement In Progress** — settlement engine running
5. **Settled** — commissions distributed to family accounts

## Financial Model

### How Commissions Work

1. Event generates revenue from stand commissions and credit card tips
2. Fund deductions are applied (general fund ~6%, board fund ~3%, insurance ~$5/worker)
3. Net income is divided equally among attended workers
4. Each worker's share is credited to their family's account

**Per-worker payout = (Total Commission + CC Tips - Fund Deductions) ÷ Attended Workers**

### Settlement

Settlement uses configurable templates with line items:
- **Income sources:** stand commission, CC tips, per-person venue payments
- **Deductions:** general fund %, board fund %, insurance per-worker
- **Distribution:** equal split among attended workers

Templates are created in the UI and referenced by ID when settling events.

### Transaction Types

- `event_commission` — earnings from working an event
- `fund_deduction` — general/board/insurance deductions
- `scholarship_payment` — scholarship credit
- `bonus` — manual bonus from admin

## Worker Assignment Flow

### Registration Status
- `confirmed` — worker is assigned and confirmed
- `waitlisted` — event is full, worker is on the waitlist
- `cancelled_by_family` — family cancelled the assignment
- `declined` — worker declined the assignment

### Attendance Status
- `assigned` — initial state
- `confirmed` — worker confirmed they'll attend
- `attended` — worker showed up and worked (earns commission)
- `no_show` — worker didn't show up
- `cancelled` — assignment cancelled

**Only workers with `attended` status earn commissions.**

## Roles

| Role | Can Do |
|------|--------|
| Organization Admin | Everything within the org |
| Event Coordinator | Create/edit events, manage workers, run settlement |
| Treasurer | View/manage finances, approve scholarships |
| Family Lead | Manage own family members, view balance |
| Family Worker | View own assignments and balance |

## Data Migration Playbook

When loading historical data, follow this order (each step depends on the previous):

1. **Users** — create user accounts (`users` → `create`)
2. **Families** — create family units (`families` → `create`)
3. **Family Members** — link users to families (`families` → `add_member`)
4. **Venues** — verify venues exist (`venues` → `search`)
5. **Events** — create historical events (`events` → `create`)
6. **Stands** — add stands to events (`events` → `add_stand`)
7. **Worker Assignments** — assign workers (`workers` → `assign`)
8. **Attendance** — mark historical attendance (`workers` → `update_assignment` with `attendanceStatus: "attended"`)
9. **Settlement** — record historical settlement data (`finances` → `record_settlement` or `settle_event`)
10. **Account Credits** — apply historical balances (`finances` → `credit_account`)
11. **Scholarships** — record historical scholarships (`finances` → `record_scholarship`)

## Glossary

- **Stand** — A physical concession station at a venue where workers serve
- **Worker Assignment** — Links a worker (user) to an event and optionally a specific stand
- **Settlement** — The process of calculating and distributing commissions after an event
- **Settlement Template** — A reusable configuration defining how settlement math works
- **Fund Distribution** — Whether an event's earnings are split among workers (vs. flat payout)
- **Per-Person Rate** — A fixed dollar amount paid per attended worker by the venue
- **Compliance Hold** — A block preventing a family from signing up until required docs are submitted
- **Tenant** — An organization on StandShare (multi-tenant SaaS)
- **Slug** — The URL-safe identifier for a tenant (e.g., "westlake")
```

- [ ] **Step 2: Register the resource in src/index.ts**

Add this import at the top of `src/index.ts`:

```typescript
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
```

Add this before the `// --- Start Server ---` comment:

```typescript
// --- Domain Guide Resource ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const guideContent = readFileSync(join(__dirname, "resources", "guide.md"), "utf-8");

server.resource(
  "guide",
  "standshare://guide",
  async (uri) => ({
    contents: [{
      uri: uri.href,
      mimeType: "text/markdown",
      text: guideContent,
    }],
  })
);
```

- [ ] **Step 3: Copy guide.md to build output**

The `guide.md` won't be copied by `tsc`. Add a build step. Update `package.json` scripts:

```json
"scripts": {
  "build": "tsc && cp -r src/resources build/resources",
  "start": "node build/index.js",
  "dev": "tsc --watch",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 4: Build and verify**

```bash
npm run build
ls build/resources/guide.md
```

Expected: File exists.

- [ ] **Step 5: Commit**

```bash
git add src/resources/guide.md src/index.ts package.json
git commit -m "feat: add domain guide MCP resource with entity model, financial model, and migration playbook"
```

---

## Task 15: End-to-End Smoke Test

**Files:**
- None new — just verify the built server works

- [ ] **Step 1: Build the project**

```bash
npm run build
```

Expected: Clean compile.

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 3: Verify the server starts (with mock env)**

```bash
STANDSHARE_API_URL=https://api.dev.standshare.app \
STANDSHARE_TENANT_SLUG=westlake \
STANDSHARE_API_TOKEN=ss_live_test \
node build/index.js &
SERVER_PID=$!
sleep 1
kill $SERVER_PID 2>/dev/null
echo "Server started and stopped cleanly"
```

Expected: No errors on startup.

- [ ] **Step 4: Verify shebang line**

```bash
head -1 build/index.js
```

Expected: `#!/usr/bin/env node`

- [ ] **Step 5: Commit any final adjustments**

```bash
git add -A
git status
# Only commit if there are changes
git diff --cached --quiet || git commit -m "chore: final build verification and cleanup"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] 8 domain tools: events, families, users, venues, finances, workers, notifications, reports
- [x] ~35 actions across all tools
- [x] Dual auth (API token + user login with refresh)
- [x] HTTP client with tenant header and 401 retry
- [x] Human-readable text responses
- [x] Domain guide resource
- [x] Error handling in MCP format
- [x] Settlement templates (read-only)
- [x] Historical data loading (credit_account, record_settlement, record_scholarship)
- [x] Claude Desktop config example (in spec, not duplicated in plan)

**Placeholder scan:** No TBDs, TODOs, or "fill in later" anywhere.

**Type consistency:**
- `toolSuccess` / `toolError` used consistently in all tools
- `StandShareClient` with `get`, `post`, `put`, `patch` used in all tools
- `handleX(client, input)` pattern consistent across all tool handlers
- Input interfaces match the Zod schemas in index.ts registrations
