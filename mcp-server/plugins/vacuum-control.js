/**
 * Plugin: vacuum-control
 *
 * Core vacuum control tools: start, stop, pause, home, locate, state.
 */

import { z } from "zod";

export const name = "vacuum-control";

/** @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server @param {import("../lib/valetudo-client.js").ValetudoClient} client */
export function register(server, client) {

    server.tool(
        "vacuum_get_state",
        "Get the current vacuum state (status, battery, map, etc.)",
        {},
        async () => {
            const state = await client.getRobotState();
            return { content: [{ type: "text", text: JSON.stringify(state, null, 2) }] };
        }
    );

    server.tool(
        "vacuum_get_info",
        "Get vacuum model info, manufacturer, and firmware version",
        {},
        async () => {
            const info = await client.getRobotInfo();
            return { content: [{ type: "text", text: JSON.stringify(info, null, 2) }] };
        }
    );

    server.tool(
        "vacuum_get_capabilities",
        "List all available capabilities on this vacuum",
        {},
        async () => {
            const caps = await client.getCapabilities();
            return { content: [{ type: "text", text: JSON.stringify(caps, null, 2) }] };
        }
    );

    server.tool(
        "vacuum_start",
        "Start a full cleaning run",
        {},
        async () => {
            await client.putCapability("BasicControlCapability", { action: "start" });
            return { content: [{ type: "text", text: "Vacuum started cleaning." }] };
        }
    );

    server.tool(
        "vacuum_stop",
        "Stop the current cleaning run",
        {},
        async () => {
            await client.putCapability("BasicControlCapability", { action: "stop" });
            return { content: [{ type: "text", text: "Vacuum stopped." }] };
        }
    );

    server.tool(
        "vacuum_pause",
        "Pause the current cleaning run",
        {},
        async () => {
            await client.putCapability("BasicControlCapability", { action: "pause" });
            return { content: [{ type: "text", text: "Vacuum paused." }] };
        }
    );

    server.tool(
        "vacuum_home",
        "Send the vacuum back to the dock",
        {},
        async () => {
            await client.putCapability("BasicControlCapability", { action: "home" });
            return { content: [{ type: "text", text: "Vacuum returning to dock." }] };
        }
    );

    server.tool(
        "vacuum_locate",
        "Make the vacuum play a sound to help locate it",
        {},
        async () => {
            await client.putCapability("LocateCapability", { action: "locate" });
            return { content: [{ type: "text", text: "Vacuum is playing a locate sound." }] };
        }
    );

    server.tool(
        "vacuum_set_fan_speed",
        "Set the vacuum fan/suction speed preset",
        { preset: z.string().describe("Fan speed preset name (e.g. 'low', 'medium', 'high', 'max')") },
        async ({ preset }) => {
            await client.putCapability("FanSpeedControlCapability", { name: preset });
            return { content: [{ type: "text", text: `Fan speed set to ${preset}.` }] };
        }
    );

    server.tool(
        "vacuum_get_fan_speed",
        "Get current fan speed presets and active preset",
        {},
        async () => {
            const data = await client.getCapability("FanSpeedControlCapability", "/presets");
            return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }
    );
}
