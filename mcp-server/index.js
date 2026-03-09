#!/usr/bin/env node

/**
 * Valetudo MCP Server
 *
 * Model Context Protocol server that exposes Valetudo vacuum capabilities
 * as MCP tools. Plugins are loaded dynamically from the plugins/ directory.
 *
 * Usage:
 *   VALETUDO_HOST=192.168.1.31 node index.js
 *
 * Or configure in your MCP client (e.g. Claude Desktop, VS Code):
 *   {
 *     "mcpServers": {
 *       "valetudo": {
 *         "command": "node",
 *         "args": ["/path/to/mcp-server/index.js"],
 *         "env": { "VALETUDO_HOST": "192.168.1.31" }
 *       }
 *     }
 *   }
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadPlugins } from "./lib/plugin-loader.js";
import { ValetudoClient } from "./lib/valetudo-client.js";

const VALETUDO_HOST = process.env.VALETUDO_HOST || "192.168.1.31";
const VALETUDO_PORT = process.env.VALETUDO_PORT || "80";

const server = new McpServer({
    name: "valetudo",
    version: "1.0.0",
    description: "Control your Valetudo vacuum via MCP tools",
});

const client = new ValetudoClient({
    host: VALETUDO_HOST,
    port: parseInt(VALETUDO_PORT, 10),
});

// Load all plugins from plugins/ directory
const plugins = await loadPlugins(server, client);

process.stderr.write(`[valetudo-mcp] Loaded ${plugins.length} plugin(s): ${plugins.map(p => p.name).join(", ")}\n`);
process.stderr.write(`[valetudo-mcp] Valetudo target: http://${VALETUDO_HOST}:${VALETUDO_PORT}\n`);

// Connect via stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
