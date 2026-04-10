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
