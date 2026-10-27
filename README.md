# standshare-mcp

[![CI](https://github.com/GraditiPro/standshare-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/GraditiPro/standshare-mcp/actions/workflows/ci.yml)
[![CodeQL](https://github.com/GraditiPro/standshare-mcp/actions/workflows/codeql.yml/badge.svg)](https://github.com/GraditiPro/standshare-mcp/actions/workflows/codeql.yml)
[![Socket Badge](https://socket.dev/api/badge/npm/package/@graditipro/standshare-mcp)](https://socket.dev/npm/package/@graditipro/standshare-mcp)
[![npm version](https://img.shields.io/npm/v/%40graditipro%2Fstandshare-mcp)](https://www.npmjs.com/package/@graditipro/standshare-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP SDK](https://img.shields.io/badge/MCP%20SDK-1.x-blue)](https://github.com/modelcontextprotocol/typescript-sdk)

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server for the StandShare API. Gives Claude and other MCP clients composable tools for managing fundraising events, families, workers, finances, notifications, and reports within a StandShare organization.

StandShare is a family fundraising platform where organizations manage concession stand events, assign workers, track attendance, and distribute earnings to family accounts.

> **Security notice.** Earlier versions of this README showed `https://api.standshare.com`. StandShare does not own that domain. If you used that URL, revoke the API key you configured in StandShare (`/admin/org-settings/api-keys`) and create a new one. If you signed in with an email and password instead, change that password. From 1.0.1 the server refuses any `STANDSHARE_API_URL` that is not a StandShare host.

---

## Tools

| Tool | Description |
|------|-------------|
| `events` | Search, view, create, and update fundraising events; add stands |
| `families` | Search, view (with balance), create families; add members |
| `users` | Search, view, create, and invite user accounts |
| `venues` | Search and view venue details |
| `finances` | Family balances, event revenue, transactions, settlement templates (read-only) |
| `workers` | Event rosters, assign workers, update attendance, check availability, view history |
| `notifications` | List notifications and send to individual users |
| `reports` | Admin dashboard KPIs, financial summaries, family compliance status |

Money is never moved through this server. Settlement, account credits and scholarships are recorded in the StandShare web app.

## Resources

| URI | Description |
|-----|-------------|
| `standshare://guide` | Domain guide covering the entity model, financial model, and migration playbook |

---

## Replacement

The hosted StandShare MCP server at `https://api.standshare.app/mcp` is the supported way to connect an MCP client to StandShare. Sign in with OAuth.

---

## Installation

### Claude Desktop

Add the following to your `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

#### API token

```json
{
  "mcpServers": {
    "standshare": {
      "command": "npx",
      "args": ["-y", "@graditipro/standshare-mcp"],
      "env": {
        "STANDSHARE_API_URL": "https://api.standshare.app",
        "STANDSHARE_TENANT_SLUG": "your-org-slug",
        "STANDSHARE_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

After editing, restart Claude Desktop. Verify the server loaded via the hammer icon (🔨) in the toolbar.

### Other MCP Clients

Run directly:

```bash
STANDSHARE_API_URL=https://api.standshare.app \
STANDSHARE_TENANT_SLUG=your-org-slug \
STANDSHARE_API_TOKEN=your-api-token \
npx @graditipro/standshare-mcp
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `STANDSHARE_API_URL` | Yes | `https://api.standshare.app`. Only StandShare hosts (`standshare.app` and its subdomains) and `localhost` / `127.0.0.1` / `[::1]` for local development are accepted |
| `STANDSHARE_TENANT_SLUG` | Yes | Your organization's tenant slug |
| `STANDSHARE_API_TOKEN` | Yes | API key created in StandShare at `/admin/org-settings/api-keys` |

---

## Authentication

Set `STANDSHARE_API_TOKEN`. The token is sent as a `Bearer` header on every request. Email and password sign-in was removed in 1.0.1.

---

## Local Development

```bash
git clone https://github.com/GraditiPro/standshare-mcp.git
cd standshare-mcp
npm install
npm run build
```

To run from a local build in Claude Desktop, replace `"npx", ["-y", "@graditipro/standshare-mcp"]` with:

```json
{
  "command": "node",
  "args": ["/absolute/path/to/standshare-mcp/build/index.js"]
}
```

---

## License

MIT
