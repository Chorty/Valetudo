# Valetudo MCP Server

Model Context Protocol server that exposes your Valetudo vacuum's capabilities as **MCP tools**, loadable in Claude Desktop, VS Code Copilot, or any MCP-compatible client.

## Quick Start

The client requires verified HTTPS. Explicit literal loopback HTTP is also
accepted for an SSH tunnel that terminates **on the robot**. It never follows
redirects or falls back from HTTPS to HTTP.

The deployed Caddy allowlist currently permits HA and robot localhost. Until a
separately approved direct-Mac HTTPS rollout, use this encrypted route:

```bash
ssh -N -o StrictHostKeyChecking=yes -o ExitOnForwardFailure=yes \
  -L 127.0.0.1:8080:127.0.0.1:80 vacuum
```

In another terminal:

```bash
VALETUDO_URL=http://127.0.0.1:8080 node mcp-server/index.js
```

On macOS, the process reads service `valetudo-basic-auth` from Keychain by
default. The account supplies the username; the password never enters command
arguments. Alternatively supply both `VALETUDO_USERNAME` and `VALETUDO_PASSWORD`
through the launcher's private environment. Do not put secrets in MCP JSON,
shell command text, URLs, logs, or tracked files. A partial pair is an error.
Set `VALETUDO_AUTH_SERVICE` to select another service; an explicitly empty value
disables Keychain lookup for installations without authentication.

For direct TLS once the Mac is allowed, use
`VALETUDO_URL=https://mattjoslin-valetudo.duckdns.org`. An IP URL cannot verify a
certificate issued only for the DNS name. Never disable certificate checking.

## MCP client configuration

The stdio server does not open a network listener. With the above tunnel running,
configure Claude Desktop (`mcpServers`) or VS Code (`servers`) with this entry:

```json
{
  "valetudo": {
    "command": "node",
    "args": ["/absolute/path/to/Valetudo/mcp-server/index.js"],
    "env": {
      "VALETUDO_URL": "http://127.0.0.1:8080",
      "VALETUDO_AUTH_SERVICE": "valetudo-basic-auth"
    }
  }
}
```

## Environment variables

| Variable | Meaning |
|---|---|
| `VALETUDO_URL` | Credential-free origin: verified HTTPS or literal-loopback HTTP |
| `VALETUDO_HOST`, `VALETUDO_PORT` | Legacy alternative to URL; HTTPS/443 by default, HTTP/80 only for `127.0.0.1` or `[::1]` |
| `VALETUDO_USERNAME`, `VALETUDO_PASSWORD` | Optional complete credential pair; takes precedence over Keychain |
| `VALETUDO_AUTH_SERVICE` | Keychain service; defaults to `valetudo-basic-auth` on macOS |
| `VALETUDO_TIMEOUT_MS` | 100–120000 ms; default 10000 |

Do not mix URL and host/port settings. Older LAN HTTP configurations need to move
to the tunnel or verified DNS-name HTTPS. A tunnel through another LAN host to
`192.168.1.31:80` leaves its final LAN hop unencrypted; use the robot as the SSH
endpoint and forward to its loopback instead.

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

MCP has no video-quality tool. Its older selector only changed an in-memory
label and restarted the pipeline. The separate, current
`RecorderQualityCapability` exposes a Home Assistant select entity that calls
the native recorder control and changes the encoder bitrate between the low
and high 864×480 profiles.

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
