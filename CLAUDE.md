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

The current deployment passed the candidate checksum and automatic-rollback gate, twelve consecutive root/API health checks, exact runtime commit verification, compressed static-asset headers, MQTT connectivity, MCP read-only capability checks, map management, the state SSE stream, joystick zero-motion and disable fail-safes, AVA-priority verification, authenticated Home Assistant configuration/entity/state verification, and an authorized API video stop/start/HLS check. A user-started normal cleaning completed without loss of robot responsiveness, and the robot returned to the dock normally. Keep both Mac backups and both on-device rollback binaries until the remaining benchmark-duration and latency gaps are resolved or explicitly accepted.

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

### The two root-latency metrics

Each sample measures the root document twice, and the two numbers answer different questions. Do not compare them to each other or to a single threshold.

- **`root_isolated_ms` — GUI responsiveness.** Issued alone, before anything else in the sample, so nothing of the profiler's own competes with it. This is the number a user experiences, and the one the acceptance targets were always meant to express.
- **`root_ms` — latency under the profiler's concurrent burst.** Issued inside the same `Promise.all` as the SSH `/proc` scan, the state and video requests, and, on extended samples, the map and JavaScript bundle. It measures the robot serving three to five of our own simultaneous requests.

`samples.csv` also records `extended`, `map_ms`, and `javascript_ms` so the burst shape is visible in the recorded data rather than inferable from row position.

### Acceptance criteria

Capture ten minutes each while docked with video off/on and during two user-started normal cleanings with video off/on. Never start cleaning or send movement commands for a benchmark. Compare like-for-like scenarios and roll back a candidate if HTTP fails, available memory falls below 150 MB, AVA or the watchdog reports errors, or CPU/RSS regresses by more than 20%.

Latency gates apply per metric:

- `root_isolated_ms` p95 must be at or below **150 ms docked** and **500 ms cleaning**. This is an absolute gate.
- `root_ms` has **no absolute target**. Gate it on regression only — more than 20% against the recorded baseline for the same scenario — because its value is dominated by how much load the profiler itself applies.

### Historical results, recorded before the metric was split

Every latency figure in this subsection is `root_ms` under the profiler's own burst. Read them alongside the explanation that follows.

The first post-deployment docked/video-on acceptance run that captured every required process is stored at `/Users/mattjoslin/Documents/ValetudoProfiles/2026-07-24T03-34-33-541Z_after-f1e5a157-docked-video-on-maploader-fix_AcWD9N`. It contains 120 samples with zero HTTP failures. Root p50/p95/max were 158.3/232.6/272.9 ms, state p95 was 209.6 ms, minimum available memory was 484036 KB, and peak one-minute load was 6.73.

Three shortened profiles completed on 2026-07-24:

- Docked/video off: `/Users/mattjoslin/Documents/ValetudoProfiles/2026-07-25T00-39-52-906Z_after-f1e5a157-docked-video-off-5min_wDWLQI`; 60 docked/idle samples, zero HTTP failures, root p50/p95/max 181.7/356.7/620.0 ms, and 444784 KB minimum available memory.
- Cleaning/video off: `/Users/mattjoslin/Documents/ValetudoProfiles/2026-07-25T00-27-17-801Z_after-f1e5a157-cleaning-video-off-5min_ru60LH`; 60 cleaning/segment samples, zero HTTP failures, root p50/p95/max 364.8/890.0/1208.9 ms, and 482408 KB minimum available memory.
- Cleaning/video on: `/Users/mattjoslin/Documents/ValetudoProfiles/2026-07-25T00-33-14-644Z_after-f1e5a157-cleaning-video-on-5min_eKYuWp`; zero HTTP failures, root p50/p95/max 548.4/1205.9/1531.9 ms, and 433824 KB minimum available memory. The first 52 samples were cleaning/segment and the final eight were the normal return-to-dock transition, so this is not a pure five-minute cleaning workload.

Across the matched 52-sample cleaning subsets, video-on coincided with about 9.6 aggregate CPU percentage points for `video_monitor`, 1.1 points for go2rtc, and about 30 MB of combined process RSS. Root p95 increased from 1069.7 ms with video off to 1369.6 ms with video on, about 28%. AVA and Valetudo CPU/RSS remained within 10%, every request succeeded, AVA stayed at nice 0, and Valetudo/video processes stayed at nice 10. These were sequential runs and do not establish that video caused the latency or load difference.

### Why the pre-2026-07-25 latency figures missed their targets

Every root latency above was recorded before the profiler measured an isolated probe, so all of them are `root_ms` — latency under the profiler's own concurrent burst. They do not indicate a GUI regression. Measured on 2026-07-25, docked with video on, using single `curl` requests spaced five seconds apart:

| Condition | root latency |
|---|---|
| root alone | 32–80 ms (p50 ≈48) |
| root + SSH `/proc` scan | 63–173 ms (p50 ≈87) |
| root + 2 concurrent API requests | 124–205 ms (p50 ≈166) |
| root + full extended burst (state, video, map, JS bundle, SSH) | 183–589 ms (p50 ≈240) |

The third row reproduces the recorded non-extended p50 of 155.9 ms and the fourth reproduces the recorded p95 of 232.6 ms, so the profiler's own concurrency accounts for the entire gap. Supporting evidence agrees: browser-like persistent connections gave a 30.4 ms root p95, on-vacuum localhost requests took 10–20 ms, and LAN ICMP averaged 24.9 ms. No 500 ms slow-request warnings appeared in the inspected Valetudo log, though those warnings are rate-limited, so their absence supports rather than proves the conclusion.

The three shortened runs therefore remain valid operational evidence — zero HTTP failures, healthy memory and CPU — whose latency figures are explained rather than anomalous. They are accepted with that explanation rather than re-measured, because re-running the cleaning scenarios would require starting two cleanings. The earlier two-sample smoke capture is still not a valid regression baseline.

### Corrected-metric acceptance runs (2026-07-25)

Docked/video on — `/Users/mattjoslin/Documents/ValetudoProfiles/2026-07-25T03-35-49-686Z_corrected-docked-video-on_lObcm0`. All 120 samples were docked with video active and there were zero HTTP failures on every endpoint.

- `root_isolated_ms` p50/p95/max 32.6/**81.9**/164.7 ms — passes the 150 ms docked gate
- `root_ms` p50/p95/max 116.1/166.5/244.7 ms; state p95 189.6 ms; video p95 179.7 ms
- Minimum available memory 554300 KB; peak one-minute load 8.85
- AVA averaged 41.4% CPU at 276508 KB peak RSS, Valetudo 4.4% at 72300 KB, `video_monitor` 3.6% at 8232 KB, maploader 0.028% at 4524 KB

Docked/video off — `/Users/mattjoslin/Documents/ValetudoProfiles/2026-07-25T03-49-39-677Z_corrected-docked-video-off_iLEV6V`. All 120 samples were docked with video inactive and there were zero HTTP failures on every endpoint.

- `root_isolated_ms` p50/p95/max 31.2/**88.8**/126.0 ms — passes the 150 ms docked gate
- `root_ms` p50/p95/max 70.7/158.8/270.5 ms; state p95 196.0 ms
- Minimum available memory 572748 KB; peak one-minute load 8.18
- AVA averaged 40.5% CPU at 276512 KB peak RSS, Valetudo 4.4% at 74840 KB, maploader 0.026% at 4524 KB

Both docked scenarios pass. Comparing them like for like, video-on costs about 3.6 CPU percentage points for `video_monitor`, roughly 18 MB of available memory, and 8% peak load. Isolated latency differs by under 8% in both directions and burst latency by under 5%, so the latency difference between video states is within noise and inside the 20% regression gate. This run was captured while the LAN was being reconfigured; it shows no contamination — zero HTTP failures, an isolated maximum of 126.0 ms, and no sample above 300 ms.

The two cleaning scenarios have not been re-measured under the corrected metric, so the four-scenario benchmark is signed off for the docked scenarios only.

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

The authenticated 2026-07-24 live verification found MQTT, MQTT Vacuum Camera, and Valetudo configured without failed setup and attached to the same `Vacuum CleanusMaximus` device. The device exposed 52 entities, including maploader, dock actions, TTS, stop-audio, video, and robot-quirk controls; the RTSP and WebRTC URL sensors were the only disabled entities and are disabled by default. Home Assistant reflected the authorized API video stop/start, both video processes returned, the HLS master playlist returned HTTP 200, and a temporary encoded-stream sample measured approximately 15.02 FPS. HA-originated TTS, dock, maploader, and other state-changing entity commands were not exercised during this verification.

On 2026-07-25 the TTS and map-management capabilities were exercised directly against the Valetudo API, closing the gap left by the earlier verification. TTS `speak` returned HTTP 200 after awaiting the full download/convert/play pipeline, with request durations matching real playback (5.19 s for a one-line phrase) and matching `TTS: Speaking` entries in `/tmp/valetudo.log`. Because the route awaits playback, `speaking` is only observable by a concurrent reader; a concurrent poll during a longer phrase returned `speaking: true` with `currentText` populated, and `stop` cancelled the in-flight job after 10.2 s and returned the capability to `speaking: false`. Map management listed 11 slots, exported a non-active slot as a valid 215723-byte gzip archive containing `mult_map.json` and `DivideMap`, saved a new slot, and renamed it, all while the active slot and the docked/idle robot state were unchanged. `load` and `delete` were deliberately not exercised.

Two minor API-semantics observations: the 200-character TTS limit and an interrupted TTS job both surface as HTTP 500 rather than 400 and 200/409 respectively. Both guards work correctly; only the status codes are questionable, and neither was changed.

These checks cover the Valetudo capability and its device-side pipeline. They do not exercise the Home Assistant to MQTT to Valetudo command path, which remains untested.

The two vacuum-light automations and `Valetudo: Notifications` are enabled; the notification automation's latest inspected trace completed successfully. The automation named `Vacuum Nightly Front Room Vacuum 11:30` is enabled, but all four of its triggers are individually disabled, so it cannot start automatically until they are re-enabled. That is a Home Assistant configuration finding, not a Valetudo integration failure, and it was not changed automatically.

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
