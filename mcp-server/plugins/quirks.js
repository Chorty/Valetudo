/**
 * Plugin: quirks
 *
 * MCP tools for reading and setting robot quirks (advanced settings).
 */

import { z } from "zod";

export const name = "quirks";

/** @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server @param {import("../lib/valetudo-client.js").ValetudoClient} client */
export function register(server, client) {

    server.tool(
        "quirks_list",
        "List all available quirks and their current values",
        {},
        async () => {
            const data = await client.getCapability("QuirksCapability");
            return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }
    );

    server.tool(
        "quirks_set",
        "Set a quirk value by its ID",
        {
            id: z.string().describe("The quirk ID (UUID from quirks_list)"),
            value: z.string().describe("The value to set (must be one of the quirk's allowed options)"),
        },
        async ({ id, value }) => {
            await client.putCapability("QuirksCapability", { id, value });
            return { content: [{ type: "text", text: `Quirk ${id} set to "${value}".` }] };
        }
    );
}
