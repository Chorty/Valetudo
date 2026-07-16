# Valetudo MCP Server

Model Context Protocol server that exposes your Valetudo vacuum's capabilities as **MCP tools**, loadable in Claude Desktop, VS Code Copilot, or any MCP-compatible client.

## Quick Start

```bash
cd mcp-server
npm install
VALETUDO_HOST=192.168.1.31 node index.js
```

The server uses MCP's stdio transport. It does not open a network listener. On
this installation, the normal topology is to run it on the Mac hosting the MCP
client and connect directly to the vacuum over the private LAN. Valetudo's
`blockExternalAccess=true` setting still permits private-LAN and localhost
clients; it blocks public/external source addresses.

## Configure in Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "valetudo": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/index.js"],
      "env": {
        "VALETUDO_HOST": "192.168.1.31",
        "VALETUDO_PORT": "80",
        "VALETUDO_TIMEOUT_MS": "10000"
      }
    }
  }
}
```

## Configure in VS Code

Add to `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "valetudo": {
      "command": "node",
      "args": ["${workspaceFolder}/mcp-server/index.js"],
      "env": {
        "VALETUDO_HOST": "192.168.1.31"
      }
    }
  }
}
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VALETUDO_HOST` | *(required)* | Vacuum IP address or hostname |
| `VALETUDO_PORT` | `80` | Valetudo webserver port |
| `VALETUDO_USERNAME` | *(unset)* | Basic Auth username; must be paired with `VALETUDO_PASSWORD` |
| `VALETUDO_PASSWORD` | *(unset)* | Basic Auth password; must be paired with `VALETUDO_USERNAME` |
| `VALETUDO_TIMEOUT_MS` | `10000` | Per-request timeout, from 100 through 120000 milliseconds |

Leave `VALETUDO_USERNAME` and `VALETUDO_PASSWORD` unset while Valetudo Basic
Auth is disabled. If Basic Auth is enabled later, set both variables in the MCP
client's environment rather than committing them to this repository.

## Optional SSH Tunnel

For an MCP client that cannot reach the vacuum's private LAN directly, create a
local tunnel through a trusted LAN host:

```bash
ssh -N -L 8080:192.168.1.31:80 <lan-host>
```

Then configure the MCP process with `VALETUDO_HOST=127.0.0.1` and
`VALETUDO_PORT=8080`. The MCP server remains a local stdio process; do not expose
it as a network service.

## Included Plugins

| Plugin | Tools | Description |
|---|---|---|
| `vacuum-control` | 10 | Start, stop, pause, home, locate, state, fan speed |
| `video-stream` | 4 | Start/stop camera stream, get status and URLs |
| `tts` | 4 | Speak text, play audio files, stop playback |
| `consumables` | 6 | Consumable status/reset, statistics, DND |
| `quirks` | 2 | List/set robot quirks (advanced settings) |
| `feature-controls` | 23 | Toggle features — carpet mode, obstacle avoidance, child lock, volume, mop dock, water usage |

**Total: 49 tools**

Video quality selection was removed because it only changed an in-memory label
and restarted the pipeline; it never changed capture resolution, bitrate, the
recorder, or go2rtc output.

## Creating a Plugin

1. Copy `plugins/_example.js` to `plugins/my-plugin.js`
2. Export `name` and `register(server, client)`
3. Use `server.tool()` to register tools
4. Use `client.getCapability()` / `client.putCapability()` for Valetudo API calls
5. Restart the server — plugins load automatically

### Minimal plugin:

```js
import { z } from "zod";
export const name = "my-plugin";

export function register(server, client) {
    server.tool(
        "my_tool",
        "Description of what this tool does",
        { param: z.string().describe("A parameter") },
        async ({ param }) => {
            const result = await client.getCapability("SomeCapability");
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
        }
    );
}
```

### Plugin rules

- Files in `plugins/` ending in `.js` are auto-loaded
- Files starting with `_` (like `_example.js`) are **skipped**
- Each plugin must export `register(server, client)`
- Plugin load order is alphabetical
- Errors in one plugin don't prevent others from loading

## Architecture

```
mcp-server/
├── index.js                  ← Entry point, creates McpServer + transport
├── package.json
├── lib/
│   ├── plugin-loader.js      ← Scans plugins/, calls register()
│   └── valetudo-client.js    ← HTTP client for Valetudo REST API
└── plugins/
    ├── _example.js           ← Template (skipped by loader)
    ├── vacuum-control.js     ← Core vacuum operations
    ├── video-stream.js       ← Camera stream management
    ├── tts.js                ← Text-to-speech
    ├── consumables.js        ← Consumables, stats, DND
    ├── quirks.js             ← Robot quirks
    └── feature-controls.js   ← Toggle features, volume, mop dock
```

## Syncing with Upstream Valetudo

The MCP server lives in `mcp-server/` which doesn't exist in upstream — **zero merge conflicts**.

```bash
git remote add upstream https://github.com/Hypfer/Valetudo.git
git fetch upstream
git merge upstream/master
# mcp-server/ is untouched, only capability files may need conflict resolution
```

## Prerequisites

- Node.js ≥ 18
- Valetudo running on the vacuum (port 80)
- For video-stream tools: `vacuumstreamer.so` + `go2rtc` deployed on vacuum
- For TTS tools: `ffmpeg` on vacuum (optional, for audio conversion)
