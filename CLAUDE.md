# Valetudo Fork — VacuumStreamer Integration

This fork adds camera streaming, text-to-speech, and safe multi-floor map management for a Dreame L10S Pro Ultra Heat. `MEMORY.md` is the compact project-state index; this file documents the architecture and operating practices.

## Repositories

- **Valetudo parent:** `Chorty/Valetudo`, branch `master`
- **Plugin submodule:** `Chorty/valetudo-vacuumstreamer-plugin`, branch `main`, mounted at `vacuumstreamer-plugin/`
- **Native companion:** `Chorty/vacuumstreamer`; contains the LD_PRELOAD capture shim, go2rtc support, HTTP bridge, and Home Assistant helpers
- **Upstream Valetudo:** `Hypfer/Valetudo`; merge into the fork only after reviewing and testing the integration points

## Robot and Access

- Dreame L10S Pro Ultra Heat, model `r9302`, firmware 1574, aarch64
- Private-LAN address: `192.168.1.31`
- SSH: `ssh vacuum` (configured in `~/.ssh/config` with `~/.ssh/vacuum_rsa`)
- Valetudo watchdog: `/data/valetudo_watchdog.sh`, started by `/data/_root_postboot.sh`
- `blockExternalAccess=true` still permits private-LAN and localhost clients

Never commit SSH keys, passwords, Home Assistant tokens, or MCP credentials. Credentials belong in the system keychain/password manager or the invoking process environment.

## Current Deployed Baseline

- Valetudo PR: `Chorty/Valetudo#6`, merged with a merge commit
- Valetudo merge commit: `1c0f5b9fdb6de5492f6f6e9acb1df006c12674ff`
- GitHub Actions build: run `29884181662`, whose `headSha` matched the merge commit
- Active ARM64 binary SHA-256: `95fe4ea4f6023acaef191a7a3a732efbcc70ca7254f3a5cf4d0d5466c775a0b9`
- Latest verified backup: `/Users/mattjoslin/Documents/GitHub/vacuumstreamer_local_archive_20260721_222234/robot_backup_20260721_215739`
- Backup archive checksum: `65b3ca8e377428602825cb48bde3b9ab91adafe39e907fff9f9e6184c5832007`
- Retained on-device rollback binary: `/data/valetudo.predeploy_1c0f5b9f`

The deployed baseline passed root/API health checks, MQTT/Home Assistant availability, MCP capability checks, map management, joystick zero-motion and disable fail-safes, video start/stop and HLS playback, and watchdog-stability checks. The robot finished idle, docked, error-free, and at 100% battery. Keep the backup and the previous on-device binary until a newer deployment passes the same acceptance gate.

## Safe Build and Deployment

Build from the exact commit intended for deployment:

```bash
npm ci
npm run lint_all
npm run ts-check_all
npm test --workspace=backend
npm run build --workspace=frontend
npm run build_aarch64 --workspace=backend
```

Before deployment:

1. Record the source commit and built artifact SHA-256.
2. Create and integrity-check a timestamped local backup of `/data`, `/mnt/private`, and `/mnt/misc`.
3. Preserve the active binary on the robot.
4. Upload the new binary under a candidate filename and verify its remote checksum.
5. Activate it through the established 60-second HTTP health gate with automatic rollback.
6. Verify root and API HTTP 200 responses, MQTT/Home Assistant availability, watchdog stability, map management, joystick stop behavior, and video start/stop.

Do not replace `/data/valetudo` directly without a fresh backup, candidate checksum verification, and rollback path.

## GUI Resource Profiling

Run the dependency-free profiler on this Mac; it only reads fixed process counters over SSH and sends bounded HTTP requests to Valetudo:

```bash
npm run profile_vacuum_resources -- --label docked-video-off --duration 600
```

Defaults are SSH host `vacuum`, HTTP base `http://192.168.1.31`, a five-second interval, a ten-minute duration, and output below `~/Documents/ValetudoProfiles`. Override them with `--ssh-host`, `--http-base`, `--interval`, `--duration`, `--timeout`, and `--output`. The HTTP URL must not contain credentials.

Each timestamped run contains mode-`0600` `samples.csv`, `summary.json`, and `metadata.json`. The summary reports HTTP failures and latency percentiles, process CPU/RSS peaks, load, and minimum available memory. The profiler never reads process arguments, environment variables, authorization headers, request queries, bodies, or robot logs.

For comparisons, capture ten minutes each while docked with video off/on and during two user-started normal cleanings with video off/on. Never start cleaning or send movement commands for a benchmark. Compare like-for-like scenarios and roll back a candidate if HTTP fails, available memory falls below 150 MB, AVA or the watchdog reports errors, or latency/CPU/RSS regresses by more than 20%.

## Plugin Capabilities

| Capability | Purpose |
|---|---|
| `VideoStreamCapability` | Starts/stops the VacuumStreamer and go2rtc pipeline and reports stream status and URLs |
| `TextToSpeechCapability` | Speaks text, plays an approved local audio file, stops playback, and reports status |
| `MapManagementCapability` | Saves, restores, renames, imports, exports, and deletes local floor-map slots |

Plugin backend code lives in `vacuumstreamer-plugin/backend/`. The parent repository supplies narrow registration hooks for capability exports, Dreame implementations, routers, robot registration, and MQTT mappings. Frontend map-management code remains in the parent because Valetudo's TypeScript capability enum and UI routing cannot be extended from the JavaScript submodule.

Video quality selection is intentionally absent. The removed selector changed only an in-memory label and restarted the pipeline; it never changed capture resolution, recorder settings, bitrate, or go2rtc output.

## Custom Valetudo API

All paths are below `/api/v2/robot/capabilities`.

### Video stream

- `GET /VideoStreamCapability` — status
- `GET /VideoStreamCapability/urls` — RTSP, WebRTC, HLS, and go2rtc URLs
- `PUT /VideoStreamCapability` with `{"action":"start"}` or `{"action":"stop"}`

### Text to speech

- `GET /TextToSpeechCapability` — playback status
- `PUT /TextToSpeechCapability` with `{"action":"speak","text":"Hello","language":"en"}`
- `PUT /TextToSpeechCapability` with `{"action":"play_file","filePath":"/approved/path/audio.wav"}`
- `PUT /TextToSpeechCapability` with `{"action":"stop"}`

### Map management

- `GET /MapManagementCapability` — list floor slots
- `PUT /MapManagementCapability` — `save`, `load`, `delete`, or `rename`
- `GET /MapManagementCapability/export/:id` — export a slot
- `POST /MapManagementCapability/import` — import a slot archive

Map data is stored below `/data/maploader`; active robot map data includes `/data/ri`, `/data/map`, `/data/DivideMap`, and `/data/config/ava/mult_map.json`.

## MQTT and Home Assistant

With Valetudo MQTT and Home Assistant autodiscovery enabled, the plugin adds:

- a TTS `notify` entity, speaking-state diagnostic sensor, and stop-audio button;
- a video-stream switch and disabled-by-default RTSP/WebRTC URL sensors.

The parent also exposes mop-dock cleaning and drying actions and supported robot quirks as Home Assistant buttons, switches, or selects. Camera media remains on go2rtc/RTSP; MQTT carries discovery, state, and commands rather than video.

The latest live verification found the `Vacuum CleanusMaximus` device docked, idle, error-free, and at 100% battery. MQTT, MQTT Vacuum Camera, and Valetudo integrations were available, and the Valetudo MQTT connection reported no disconnects, reconnects, or errors.

## MCP Server

`mcp-server/` is a local stdio Model Context Protocol server. It exposes 49 Valetudo tools without opening a network listener. The normal topology is to run it on this Mac and connect directly to `192.168.1.31`.

Environment variables:

| Variable | Requirement |
|---|---|
| `VALETUDO_HOST` | Required |
| `VALETUDO_PORT` | Optional; defaults to `80` |
| `VALETUDO_USERNAME` and `VALETUDO_PASSWORD` | Optional, but must be supplied together |
| `VALETUDO_TIMEOUT_MS` | Optional; defaults to `10000`, range 100–120000 ms |

Leave username/password unset while Valetudo Basic Auth is disabled. For remote clients, tunnel through a trusted LAN host with `ssh -N -L 8080:192.168.1.31:80 <lan-host>` and point MCP at `127.0.0.1:8080`. See `mcp-server/README.md` for configuration and tool inventory.

## Native VacuumStreamer Prerequisites

- `/data/vacuumstreamer/vacuumstreamer.so`
- `/data/vacuumstreamer/go2rtc`
- `/data/vacuumstreamer/go2rtc.yaml`
- `/data/vacuumstreamer/tts_handler.sh`, launched through `tcpsvd` on port 6971
- `ffmpeg` when audio conversion is required

## Development Rules

- Commit plugin changes first, then update and commit the parent submodule pointer.
- Keep parent integration hooks narrow and avoid copying plugin backend code into Valetudo core.
- Run plugin tests through the parent backend workspace because the plugin intentionally has no standalone package.
- Preserve safe filesystem allowlists and joystick zero-motion/disable fail-safes.
- Treat backup directories, firmware extracts, binaries, `.DS_Store`, keys, and credentials as local artifacts, not source files.
- Review `git status` in the parent, plugin, and native companion independently.

## Upstream Synchronization

```bash
git fetch origin
git merge origin/master
```

In this checkout, `origin` is Hypfer's upstream and `fork` is Chorty's fork. Re-run lint, type checks, tests, production frontend build, and ARM64 packaging after every upstream integration.

## Known Harmless Warnings

- `unknown water grade` during AVA restart
- `misc tunables` noise already present upstream
