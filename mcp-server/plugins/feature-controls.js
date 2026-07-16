/**
 * Plugin: feature-controls
 *
 * MCP tools for toggle-style vacuum features: carpet mode, obstacle avoidance,
 * child lock, speaker volume, auto-empty interval, etc.
 */

import { z } from "zod";

export const name = "feature-controls";

/** @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server @param {import("../lib/valetudo-client.js").ValetudoClient} client */
export function register(server, client) {

    // ── Simple toggles ──────────────────────────────────────────────────

    const toggleCapabilities = [
        { tool: "carpet_mode", cap: "CarpetModeControlCapability", label: "Carpet mode" },
        { tool: "obstacle_avoidance", cap: "ObstacleAvoidanceControlCapability", label: "Obstacle avoidance" },
        { tool: "pet_obstacle_avoidance", cap: "PetObstacleAvoidanceControlCapability", label: "Pet obstacle avoidance" },
        { tool: "child_lock", cap: "KeyLockCapability", label: "Child lock / key lock" },
        { tool: "collision_avoidant_nav", cap: "CollisionAvoidantNavigationControlCapability", label: "Collision avoidant navigation" },
        { tool: "mop_extension", cap: "MopExtensionControlCapability", label: "Mop extension" },
    ];

    for (const { tool, cap, label } of toggleCapabilities) {
        server.tool(
            `${tool}_get`,
            `Get ${label} status (enabled/disabled)`,
            {},
            async () => {
                const data = await client.getCapability(cap);
                return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            }
        );

        server.tool(
            `${tool}_set`,
            `Enable or disable ${label}`,
            { enable: z.boolean().describe(`true to enable, false to disable ${label}`) },
            async ({ enable }) => {
                await client.putCapability(cap, { action: enable ? "enable" : "disable" });
                return { content: [{ type: "text", text: `${label} ${enable ? "enabled" : "disabled"}.` }] };
            }
        );
    }

    // ── Speaker volume ──────────────────────────────────────────────────

    server.tool(
        "speaker_volume_get",
        "Get the current speaker volume (0-100)",
        {},
        async () => {
            const data = await client.getCapability("SpeakerVolumeControlCapability");
            return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }
    );

    server.tool(
        "speaker_volume_set",
        "Set the speaker volume",
        { volume: z.number().min(0).max(100).describe("Volume level 0-100") },
        async ({ volume }) => {
            await client.putCapability("SpeakerVolumeControlCapability", {
                action: "set_volume",
                value: volume,
            });
            return { content: [{ type: "text", text: `Speaker volume set to ${volume}%.` }] };
        }
    );

    // ── Auto-empty dock ─────────────────────────────────────────────────

    server.tool(
        "auto_empty_trigger",
        "Manually trigger the auto-empty dock to empty the dustbin",
        {},
        async () => {
            await client.putCapability("AutoEmptyDockManualTriggerCapability", { action: "trigger" });
            return { content: [{ type: "text", text: "Auto-empty dock triggered." }] };
        }
    );

    server.tool(
        "auto_empty_interval_get",
        "Get the auto-empty interval setting",
        {},
        async () => {
            const data = await client.getCapability("AutoEmptyDockAutoEmptyIntervalControlCapability");
            return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }
    );

    // ── Mop dock controls ───────────────────────────────────────────────

    server.tool(
        "mop_dock_clean",
        "Trigger mop pad cleaning on the dock",
        {},
        async () => {
            await client.putCapability("MopDockCleanManualTriggerCapability", { action: "trigger" });
            return { content: [{ type: "text", text: "Mop dock cleaning triggered." }] };
        }
    );

    server.tool(
        "mop_dock_dry",
        "Trigger mop pad drying on the dock",
        {},
        async () => {
            await client.putCapability("MopDockDryManualTriggerCapability", { action: "trigger" });
            return { content: [{ type: "text", text: "Mop dock drying triggered." }] };
        }
    );

    // ── Carpet sensor mode ──────────────────────────────────────────────

    server.tool(
        "carpet_sensor_mode_get",
        "Get carpet sensor mode setting",
        {},
        async () => {
            const data = await client.getCapability("CarpetSensorModeControlCapability");
            return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }
    );

    // ── Obstacle images ─────────────────────────────────────────────────

    server.tool(
        "obstacle_images_get",
        "Get obstacle detection images (if available)",
        {},
        async () => {
            const data = await client.getCapability("ObstacleImagesCapability");
            return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }
    );

    server.tool(
        "obstacle_images_toggle",
        "Enable or disable obstacle image capture",
        { enable: z.boolean().describe("true to enable, false to disable") },
        async ({ enable }) => {
            await client.putCapability("ObstacleImagesCapability", {
                action: enable ? "enable" : "disable",
            });
            return { content: [{ type: "text", text: `Obstacle images ${enable ? "enabled" : "disabled"}.` }] };
        }
    );

    // ── Water usage control ─────────────────────────────────────────────

    server.tool(
        "water_usage_get",
        "Get current water usage / mop wetness presets",
        {},
        async () => {
            const data = await client.getCapability("WaterUsageControlCapability", "/presets");
            return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }
    );

    server.tool(
        "water_usage_set",
        "Set water usage / mop wetness preset",
        { preset: z.string().describe("Water usage preset name") },
        async ({ preset }) => {
            await client.putCapability("WaterUsageControlCapability", { name: preset });
            return { content: [{ type: "text", text: `Water usage set to ${preset}.` }] };
        }
    );
}
