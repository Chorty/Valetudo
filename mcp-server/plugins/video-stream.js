/**
 * Plugin: video-stream
 *
 * MCP tools for the VideoStreamCapability — start/stop camera stream,
 * and get RTSP/WebRTC/HLS URLs.
 */

export const name = "video-stream";

/** @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server @param {import("../lib/valetudo-client.js").ValetudoClient} client */
export function register(server, client) {

    server.tool(
        "stream_get_status",
        "Get the current video stream status (active and process IDs)",
        {},
        async () => {
            const status = await client.getCapability("VideoStreamCapability");
            return { content: [{ type: "text", text: JSON.stringify(status, null, 2) }] };
        }
    );

    server.tool(
        "stream_start",
        "Start the vacuum camera video stream (vacuumstreamer + go2rtc pipeline)",
        {},
        async () => {
            await client.putCapability("VideoStreamCapability", { action: "start" });
            const urls = await client.getCapability("VideoStreamCapability", "/urls");
            return {
                content: [{
                    type: "text",
                    text: `Video stream started.\n\nStream URLs:\n${JSON.stringify(urls, null, 2)}`
                }]
            };
        }
    );

    server.tool(
        "stream_stop",
        "Stop the vacuum camera video stream",
        {},
        async () => {
            await client.putCapability("VideoStreamCapability", { action: "stop" });
            return { content: [{ type: "text", text: "Video stream stopped." }] };
        }
    );

    server.tool(
        "stream_get_urls",
        "Get stream URLs (RTSP, WebRTC, HLS, go2rtc API)",
        {},
        async () => {
            const urls = await client.getCapability("VideoStreamCapability", "/urls");
            return { content: [{ type: "text", text: JSON.stringify(urls, null, 2) }] };
        }
    );

}
