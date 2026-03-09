/**
 * Example Plugin Template
 *
 * Copy this file and rename it to create a new plugin.
 * Plugins are auto-loaded from the plugins/ directory on server start.
 *
 * Requirements:
 *   - Must export `name` (string) — plugin identifier
 *   - Must export `register(server, client)` — called on load
 *   - Use server.tool() to register MCP tools
 *   - Use client.getCapability() / client.putCapability() to call Valetudo API
 *   - Files starting with _ are skipped by the loader
 *
 * Zod schemas are used for tool parameter validation.
 */

import { z } from "zod";

export const name = "example";

/**
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server
 * @param {import("../lib/valetudo-client.js").ValetudoClient} client
 */
export function register(server, client) {

    // Example: a read-only tool
    server.tool(
        "example_hello",
        "An example tool that returns a greeting",
        {
            whom: z.string().optional().describe("Who to greet (default: 'World')"),
        },
        async ({ whom }) => {
            return {
                content: [{
                    type: "text",
                    text: `Hello, ${whom || "World"}! This is the example plugin.`,
                }],
            };
        }
    );

    // Example: calling the Valetudo API
    // Uncomment and modify as needed:
    //
    // server.tool(
    //     "example_get_battery",
    //     "Get the vacuum's battery level",
    //     {},
    //     async () => {
    //         const state = await client.getRobotState();
    //         const battery = state?.attributes?.find(a => a.__class === "BatteryStateAttribute");
    //         return {
    //             content: [{
    //                 type: "text",
    //                 text: `Battery: ${battery?.level ?? "unknown"}%`,
    //             }],
    //         };
    //     }
    // );
}
