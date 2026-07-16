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
import { readConfig } from "./lib/config.js";
import { loadPlugins } from "./lib/plugin-loader.js";
import { ValetudoClient } from "./lib/valetudo-client.js";

let config;
try {
    config = readConfig();
} catch (error) {
    process.stderr.write(`[valetudo-mcp] Configuration error: ${error.message}\n`);
    process.exit(1);
}

const server = new McpServer({
    name: "valetudo",
    version: "1.0.0",
    description: "Control your Valetudo vacuum via MCP tools",
});

const client = new ValetudoClient({
    host: config.host,
    port: config.port,
    timeoutMs: config.timeoutMs,
    username: config.username,
    password: config.password,
});

// Load all plugins from plugins/ directory
const plugins = await loadPlugins(server, client);

process.stderr.write(`[valetudo-mcp] Loaded ${plugins.length} plugin(s): ${plugins.map(p => p.name).join(", ")}\n`);
process.stderr.write(`[valetudo-mcp] Valetudo target: http://${config.host}:${config.port}\n`);

// Connect via stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
