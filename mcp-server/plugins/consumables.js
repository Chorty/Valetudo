/**
 * Plugin: consumables
 *
 * MCP tools for statistics, consumable monitoring, and DND.
 */

import { z } from "zod";

export const name = "consumables";

/** @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server @param {import("../lib/valetudo-client.js").ValetudoClient} client */
export function register(server, client) {

    server.tool(
        "consumables_get",
        "Get consumable status (filter, brush, mop lifespan percentages)",
        {},
        async () => {
            const data = await client.getCapability("ConsumableMonitoringCapability");
            return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }
    );

    server.tool(
        "consumables_reset",
        "Reset a consumable's usage counter",
        {
            type: z.string().describe("Consumable type (e.g. 'filter', 'brush', 'mop')"),
            subType: z.string().optional().describe("Consumable sub-type (e.g. 'main', 'side_right')"),
        },
        async ({ type, subType }) => {
            const body = { action: "reset", type };
            if (subType) {
                body.sub_type = subType;
            }
            await client.putCapability("ConsumableMonitoringCapability", body);
            return { content: [{ type: "text", text: `Consumable ${type}${subType ? "/" + subType : ""} reset.` }] };
        }
    );

    server.tool(
        "statistics_total",
        "Get total lifetime statistics (area, time, count)",
        {},
        async () => {
            const data = await client.getCapability("TotalStatisticsCapability");
            return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }
    );

    server.tool(
        "statistics_current",
        "Get current/last cleaning session statistics",
        {},
        async () => {
            const data = await client.getCapability("CurrentStatisticsCapability");
            return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }
    );

    server.tool(
        "dnd_get",
        "Get Do Not Disturb schedule",
        {},
        async () => {
            const data = await client.getCapability("DoNotDisturbCapability");
            return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }
    );

    server.tool(
        "dnd_set",
        "Set Do Not Disturb schedule",
        {
            enabled: z.boolean().describe("Enable or disable DND"),
            start_hour: z.number().min(0).max(23).optional().describe("Start hour (0-23)"),
            start_minute: z.number().min(0).max(59).optional().describe("Start minute (0-59)"),
            end_hour: z.number().min(0).max(23).optional().describe("End hour (0-23)"),
            end_minute: z.number().min(0).max(59).optional().describe("End minute (0-59)"),
        },
        async ({ enabled, start_hour, start_minute, end_hour, end_minute }) => {
            const body = { action: "set_dnd", enabled };
            if (start_hour !== undefined) {
                body.start = { hour: start_hour, minute: start_minute || 0 };
                body.end = { hour: end_hour || 8, minute: end_minute || 0 };
            }
            await client.putCapability("DoNotDisturbCapability", body);
            return { content: [{ type: "text", text: `DND ${enabled ? "enabled" : "disabled"}.` }] };
        }
    );
}
