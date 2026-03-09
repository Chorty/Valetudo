/**
 * Plugin Loader
 *
 * Scans the plugins/ directory for .js files, imports each one, and calls
 * its `register(server, client)` function to register MCP tools/resources.
 *
 * Plugin contract:
 *   export const name = "my-plugin";
 *   export function register(server, client) { ... }
 *
 *   - server: McpServer instance — call server.tool() to register tools
 *   - client: ValetudoClient instance — use to call Valetudo API
 */

import { readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGINS_DIR = join(__dirname, "..", "plugins");

/**
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server
 * @param {import("./valetudo-client.js").ValetudoClient} client
 * @returns {Promise<Array<{name: string}>>}
 */
export async function loadPlugins(server, client) {
    const loaded = [];

    let files;
    try {
        files = await readdir(PLUGINS_DIR);
    } catch (e) {
        process.stderr.write(`[plugin-loader] plugins/ directory not found, no plugins loaded\n`);
        return loaded;
    }

    const pluginFiles = files.filter(f => f.endsWith(".js") && !f.startsWith("_"));

    for (const file of pluginFiles.sort()) {
        try {
            const pluginUrl = pathToFileURL(join(PLUGINS_DIR, file)).href;
            const plugin = await import(pluginUrl);

            if (typeof plugin.register !== "function") {
                process.stderr.write(`[plugin-loader] Skipping ${file}: no register() export\n`);
                continue;
            }

            plugin.register(server, client);

            const pluginName = plugin.name || file.replace(/\.js$/, "");
            loaded.push({ name: pluginName });

            process.stderr.write(`[plugin-loader] ✓ ${pluginName}\n`);
        } catch (e) {
            process.stderr.write(`[plugin-loader] ✗ Failed to load ${file}: ${e.message}\n`);
        }
    }

    return loaded;
}
