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

- GUI resource/observability PR: `Chorty/Valetudo#7`, merge commit `6a8829ea02257bd8d3314d0d9052655e21f8056f`
- Static MIME hotfix PR: `Chorty/Valetudo#8`, final merge commit `f1e5a1575df4e472aa98ade4ade4cde7d5b50fb0`
- Exact-merge GitHub Actions build: run `30062082320`, whose `headSha` matched `f1e5a1575df4e472aa98ade4ade4cde7d5b50fb0`
- Active ARM64 binary SHA-256: `6d9f1ed543a37c261a8ffd2da675c2a47c3e073775c9852b0a5d4b82ac7d74a5`
- Latest verified backup package: `/Users/mattjoslin/Documents/ValetudoBackups/valetudo_f1e5a157_20260723_224321`
- Backup archive checksum: `0ae1689204a0d9b4e95203fdc127d23952f984fe58b167461d1401895aaf37f8`
- Immediate on-device rollback binary: `/data/valetudo.predeploy_f1e5a157`
- Earlier retained rollback binary: `/data/valetudo.predeploy_6a8829ea`

The current deployment passed the candidate checksum and automatic-rollback gate, twelve consecutive root/API health checks, exact runtime commit verification, compressed static-asset headers, MQTT connectivity, MCP read-only capability checks, map management, the state SSE stream, joystick zero-motion and disable fail-safes, AVA-priority verification, and initial watchdog stability. The robot remained idle, docked, error-free, and at 100% battery. Authenticated Home Assistant entity verification and the state-changing video stop/start check remain user-gated; do not claim those checks for this deployment until they are recorded below. Keep both Mac backups and both on-device rollback binaries until final acceptance is complete.

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

Defaults are SSH host `vacuum`, HTTP base `http://192.168.1.31`, a five-second interval, a ten-minute duration, and output below `~/Documents/ValetudoProfiles`. Override them with `--ssh-host`, `--http-base`, `--interval`, `--duration`, `--timeout`, and `--output`. The SSH value must be a host alias or IP address, not an option. The HTTP value must be a credential-free origin with no path, query, or fragment. Duration is limited to 5–86400 seconds, interval to 1–3600 seconds, timeout to 100–120000 milliseconds, and a run to 10000 samples.

Each run receives a unique private mode-`0700` directory containing exclusively created mode-`0600` `samples.csv`, `summary.json`, and `metadata.json`. The summary reports HTTP failures and latency percentiles, process CPU/RSS peaks, load, and minimum available memory. SSH output and HTTP bodies are size-bounded, every operation has an absolute deadline, and the measured JavaScript bundle must be an exact same-origin hashed main asset. The profiler never reads process arguments, environment variables, authorization headers, request queries, bodies, or robot logs.

For comparisons, capture ten minutes each while docked with video off/on and during two user-started normal cleanings with video off/on. Never start cleaning or send movement commands for a benchmark. Compare like-for-like scenarios and roll back a candidate if HTTP fails, available memory falls below 150 MB, AVA or the watchdog reports errors, or latency/CPU/RSS regresses by more than 20%.

The first post-deployment docked/video-on acceptance run that captured every required process is stored at `/Users/mattjoslin/Documents/ValetudoProfiles/2026-07-24T03-34-33-541Z_after-f1e5a157-docked-video-on-maploader-fix_AcWD9N`. It contains 120 samples with zero HTTP failures. Root p50/p95/max were 158.3/232.6/272.9 ms, state p95 was 209.6 ms, minimum available memory was 484036 KB, and peak one-minute load was 6.73. The 232.6 ms root p95 misses the formal 150 ms docked target, so the four-scenario benchmark is not signed off. A separate browser-like persistent-connection check produced a 30.4 ms root p95 over 30 requests, on-vacuum localhost root requests took 10–20 ms, and LAN ICMP averaged 24.9 ms with a 58.3 ms maximum; this evidence points to connection/network overhead rather than a blocked HTTP event loop, but it does not replace the formal profile result. The only earlier “before” capture was a two-sample smoke test and is not a valid regression baseline.

Linux truncates `/proc/<pid>/comm` to 15 characters, so this robot reports the maploader as `maploader-binar`. The profiler accepts both that deployed name and `maploader`; the corrected run measured maploader at 0.026% average CPU and 4400 KB peak RSS.

Set `VALETUDO_SLOW_REQUEST_MS=500` only during an acceptance deployment to log privacy-safe warnings for HTTP responses taking at least 500 ms. The variable defaults to `0` (disabled) and accepts `0` or an integer from 100 through 60000. Telemetry excludes SSE and log-content routes and never logs queries, bodies, headers, client addresses, or credentials.

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
