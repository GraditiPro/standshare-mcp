# standshare-mcp

[![CI](https://github.com/GraditiPro/standshare-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/GraditiPro/standshare-mcp/actions/workflows/ci.yml)
[![CodeQL](https://github.com/GraditiPro/standshare-mcp/actions/workflows/codeql.yml/badge.svg)](https://github.com/GraditiPro/standshare-mcp/actions/workflows/codeql.yml)
[![npm version](https://img.shields.io/npm/v/standshare-mcp)](https://www.npmjs.com/package/standshare-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP SDK](https://img.shields.io/badge/MCP%20SDK-1.x-blue)](https://github.com/modelcontextprotocol/typescript-sdk)

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server for the StandShare API. Gives Claude and other MCP clients composable tools for managing fundraising events, families, workers, finances, notifications, and reports within a StandShare organization.

StandShare is a family fundraising platform where organizations manage concession stand events, assign workers, track attendance, and distribute earnings to family accounts.

---

## Tools

| Tool | Description |
|------|-------------|
| `events` | Search, view, create, and update fundraising events; add stands |
| `families` | Search, view (with balance), create families; add members |
| `users` | Search, view, create, and invite user accounts |
| `venues` | Search and view venue details |
| `finances` | Family balances, event revenue, transactions, settlement, credits, scholarships |
| `workers` | Event rosters, assign workers, update attendance, check availability, view history |
| `notifications` | List, send to individual users, and broadcast org-wide announcements |
| `reports` | Admin dashboard KPIs, financial summaries, family compliance status |

## Resources

| URI | Description |
|-----|-------------|
| `standshare://guide` | Domain guide covering the entity model, financial model, and migration playbook |

---

## Installation

### Claude Desktop

Add the following to your `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

#### Option A — API Token (recommended)

```json
{
  "mcpServers": {
    "standshare": {
      "command": "npx",
      "args": ["-y", "standshare-mcp"],
      "env": {
        "STANDSHARE_API_URL": "https://api.standshare.com",
        "STANDSHARE_TENANT_SLUG": "your-org-slug",
        "STANDSHARE_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

#### Option B — Email & Password

```json
{
  "mcpServers": {
    "standshare": {
      "command": "npx",
      "args": ["-y", "standshare-mcp"],
      "env": {
        "STANDSHARE_API_URL": "https://api.standshare.com",
        "STANDSHARE_TENANT_SLUG": "your-org-slug",
        "STANDSHARE_EMAIL": "admin@yourorg.com",
        "STANDSHARE_PASSWORD": "your-password"
      }
    }
  }
}
```

After editing, restart Claude Desktop. Verify the server loaded via the hammer icon (🔨) in the toolbar.

### Other MCP Clients

Run directly:

```bash
STANDSHARE_API_URL=https://api.standshare.com \
STANDSHARE_TENANT_SLUG=your-org-slug \
STANDSHARE_API_TOKEN=your-api-token \
npx standshare-mcp
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `STANDSHARE_API_URL` | Yes | Base URL of your StandShare API instance |
| `STANDSHARE_TENANT_SLUG` | Yes | Your organization's tenant slug |
| `STANDSHARE_API_TOKEN` | One of* | API token for token-based auth |
| `STANDSHARE_EMAIL` | One of* | Admin email for credential-based auth |
| `STANDSHARE_PASSWORD` | One of* | Admin password for credential-based auth |

\* Either `STANDSHARE_API_TOKEN` **or** both `STANDSHARE_EMAIL` + `STANDSHARE_PASSWORD` must be set.

---

## Authentication

Two strategies are supported:

**API Token** — Set `STANDSHARE_API_TOKEN`. The token is sent as a `Bearer` header on every request. Preferred for production and automated use.

**Email / Password** — Set `STANDSHARE_EMAIL` and `STANDSHARE_PASSWORD`. The server logs in on first use, then uses refresh tokens to maintain the session automatically.

---

## Local Development

```bash
git clone https://github.com/GraditiPro/standshare-mcp.git
cd standshare-mcp
npm install
npm run build
```

To run from a local build in Claude Desktop, replace `"npx", ["-y", "standshare-mcp"]` with:

```json
{
  "command": "node",
  "args": ["/absolute/path/to/standshare-mcp/build/index.js"]
}
```

---

## License

MIT
