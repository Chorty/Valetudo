/**
 * Plugin: tts
 *
 * MCP tools for the TextToSpeechCapability — speak text through
 * the vacuum's speaker using Google Translate TTS.
 */

import { z } from "zod";

export const name = "tts";

/** @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server @param {import("../lib/valetudo-client.js").ValetudoClient} client */
export function register(server, client) {

    server.tool(
        "tts_speak",
        "Speak a text message through the vacuum's speaker",
        {
            text: z.string().max(200).describe("The text to speak (max 200 chars)"),
            language: z.string().default("en").describe("Language code, e.g. 'en', 'de', 'fr', 'es'"),
        },
        async ({ text, language }) => {
            await client.putCapability("TextToSpeechCapability", {
                action: "speak",
                text,
                language: language || "en",
            });
            return { content: [{ type: "text", text: `Speaking: "${text}" (${language || "en"})` }] };
        }
    );

    server.tool(
        "tts_play_file",
        "Play an audio file on the vacuum",
        {
            filePath: z.string().describe("Absolute path to audio file on the vacuum (e.g. /tmp/audio.wav)"),
        },
        async ({ filePath }) => {
            await client.putCapability("TextToSpeechCapability", {
                action: "play_file",
                filePath,
            });
            return { content: [{ type: "text", text: `Playing: ${filePath}` }] };
        }
    );

    server.tool(
        "tts_stop",
        "Stop any currently playing audio on the vacuum",
        {},
        async () => {
            await client.putCapability("TextToSpeechCapability", { action: "stop" });
            return { content: [{ type: "text", text: "Audio playback stopped." }] };
        }
    );

    server.tool(
        "tts_get_status",
        "Get the current TTS status (speaking, language, current text)",
        {},
        async () => {
            const status = await client.getCapability("TextToSpeechCapability");
            return { content: [{ type: "text", text: JSON.stringify(status, null, 2) }] };
        }
    );
}
