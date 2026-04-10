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
