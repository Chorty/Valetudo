# Valetudo Fork — VacuumStreamer Plugin

## Project Overview

This is a fork of [Valetudo](https://github.com/Hypfer/Valetudo) (v2026.05.0) with added capabilities for the **Dreame L10S Pro Ultra Heat** vacuum. The project spans two repositories:

- **Valetudo fork** (`chorty/Valetudo`, branch `feature/vacuumstreamer-plugin`) — adds three new capabilities to Valetudo and a companion MCP server
- **VacuumStreamer repo** (`chorty/vacuumstreamer`) — the `.so` LD_PRELOAD shim, HTTP bridge daemon (`tts_handler.sh`), HA automation generators, and HA packages

## Robot & Environment

- **Robot**: Dreame L10S Pro Ultra Heat, model r9302, FW 1574, aarch64, IP `192.168.1.31`
- **SSH key**: `/Users/mattjoslin/Documents/GitHub/vacuumstreamer/privatekeybc3a.id_rsa`
- **Valetudo source**: `/Users/mattjoslin/Documents/GitHub/Valetudo/`
- **VacuumStreamer source**: `/Users/mattjoslin/Documents/GitHub/vacuumstreamer/`
- **blockExternalAccess**: true — test API via `ssh ... 'wget -qO- http://127.0.0.1:80/...'`
- **Watchdog**: `/data/valetudo_watchdog.sh` (while-true respawn), launched by `/data/_root_postboot.sh`

---

## Build & Deploy

```bash
# 0. After any npm install: fix swagger-ui-express hoisting issue
#    (upstream package-lock.json dehoists express, breaking pkg bundling)
cd /Users/mattjoslin/Documents/GitHub/Valetudo
cp -r node_modules/swagger-ui-express backend/node_modules/swagger-ui-express

# 1. Fix ajv dep conflict (required before every frontend build)
cd node_modules/ajv-keywords && npm install ajv@^8.8.2 --no-save && cd ../..

# 2. Build frontend
npm run build --workspace=frontend

# 3. Build aarch64 binary (output: build/aarch64/valetudo — root level, NOT backend/build/)
cd backend && npm run build_aarch64 && cd ..

# 4. Deploy (watchdog auto-restarts valetudo, takes ~17-20s)
ssh -i /Users/mattjoslin/Documents/GitHub/vacuumstreamer/privatekeybc3a.id_rsa root@192.168.1.31 "cat > /tmp/valetudo_new" < build/aarch64/valetudo
ssh -i /Users/mattjoslin/Documents/GitHub/vacuumstreamer/privatekeybc3a.id_rsa root@192.168.1.31 \
  "chmod +x /tmp/valetudo_new && mv /tmp/valetudo_new /data/valetudo && killall valetudo"
```

---

## Valetudo Fork — Added Capabilities

### Three New Capabilities

| Capability | Type string | What it does |
|---|---|---|
| `VideoStreamCapability` | `"VideoStreamCapability"` | Starts/stops LD_PRELOAD video pipeline (`vacuumstreamer.so` + `go2rtc`) exposing RTSP/WebRTC/HLS |
| `TextToSpeechCapability` | `"TextToSpeechCapability"` | Google Translate TTS → downloads MP3 → converts via ffmpeg → plays via `aplay` |
| `MapManagementCapability` | `"MapManagementCapability"` | File-swap floor switching — backup/restore `/data/ri`, `/data/map`, `/data/DivideMap` |

### Frontend Additions

- `frontend/src/robot/capabilities/MapManagementCapability.tsx` — "Floor Management" React page with active-floor banner, green "Active" chip, "Switch Floor" confirmation dialog
- `frontend/public/joystick.html` — Self-contained analog joystick page, served at `/joystick.html`. Sends continuous drive commands at 10Hz via `HighResolutionManualControlCapability`. Designed to be embedded as an HA iframe card. Auto-enables/disables drive mode on touch start/idle.
- `frontend/src/robot/VacuumstreamerRoutes.tsx` — Route registration for MapManagementCapability page
- `frontend/src/components/VacuumstreamerMenuItems.ts` — "Floor Management" nav item
- `frontend/src/api/VacuumstreamerApiClient.ts` — API client functions
- `frontend/src/api/VacuumstreamerApiHooks.ts` — React Query hooks

### Bug Fixes Applied to Fork

- **Express 5→4**: Downgraded to Express 4 for static pkg binary compatibility
- **OpenAPI schema**: Included schema in pkg assets (was missing)
- **Node 22 module-sync**: Patched pkg module-sync exports
- **V1 MopExtensionControl**: L10S Pro Ultra Heat FW 1574 needs `V1` variant (not V2)
- **QuirkFactory ExtrFreq**: Guard against undefined for robots that don't return this field

---

## Plugin Architecture & Submodule

All plugin backend code lives in the `vacuumstreamer-plugin` git submodule at `Valetudo/vacuumstreamer-plugin/` (repo: `Chorty/valetudo-vacuumstreamer-plugin`).

### Submodule structure

```
vacuumstreamer-plugin/backend/
├── core-capabilities/          MapManagementCapability.js, TextToSpeechCapability.js, VideoStreamCapability.js
├── dreame-capabilities/        DreameMapManagementCapability.js, DreameTextToSpeechCapability.js, DreameVideoStreamCapability.js
├── capability-routers/         MapManagementCapabilityRouter.js, TextToSpeechCapabilityRouter.js, VideoStreamCapabilityRouter.js
├── VacuumstreamerExtensions.js     registers all 3 capabilities on the robot
└── VacuumstreamerCapabilityRouterMappings.js  maps capability TYPEs → routers
```

### Upstream files modified (5 total, 1 line each)

| File | Change |
|---|---|
| `backend/lib/core/capabilities/index.js` | `Object.assign(module.exports, require("../../../../vacuumstreamer-plugin/backend/core-capabilities"))` |
| `backend/lib/webserver/capabilityRouters/index.js` | `Object.assign(module.exports, require("../../../../vacuumstreamer-plugin/backend/capability-routers"))` |
| `backend/lib/robots/dreame/capabilities/index.js` | `Object.assign(module.exports, require("../../../../../vacuumstreamer-plugin/backend/dreame-capabilities"))` |
| `backend/lib/webserver/CapabilitiesRouter.js` | `Object.assign(CAPABILITY_TYPE_TO_ROUTER_MAPPING, require("../../../vacuumstreamer-plugin/backend/VacuumstreamerCapabilityRouterMappings"))` |
| `backend/lib/robots/dreame/DreameL10SProUltraHeatValetudoRobot.js` | `require("../../../../vacuumstreamer-plugin/backend/VacuumstreamerExtensions")(this)` |

**Upstream merges from `hypfer/valetudo` are zero-touch** — no plugin code appears in any upstream file beyond one `require()` line per file.

### Frontend files (stay in fork, no submodule)

TypeScript enums can't be extended externally, so these stay in the fork:

- `frontend/src/api/types.ts` — `Capability.MapManagement`, `MapManagementMapEntry`, `MapManagementCommand` interfaces
- `frontend/src/api/index.ts` — re-exports `VacuumstreamerApiClient` and `VacuumstreamerApiHooks`
- `frontend/src/robot/RobotRouter.tsx` — `{vacuumstreamerRoutes}`
- `frontend/src/components/ValetudoAppBar.tsx` — `...vacuumstreamerMenuItems`
- Frontend Vacuumstreamer* files (routes, menu items, API client, hooks, MapManagementCapability page)

---

## MCP Server (`mcp-server/`)

Node.js Model Context Protocol server in `Valetudo/mcp-server/` exposing Valetudo and plugin capabilities as MCP tools. Uses a plugin system — drop a `.js` file in `mcp-server/plugins/` to add tools.

**Plugins:**

| Plugin | Tools exposed |
|---|---|
| `vacuum-control.js` | start, stop, pause, home, locate, get state, fan speed |
| `video-stream.js` | start/stop stream, get status/URLs/quality, set quality |
| `tts.js` | speak text, play audio file, stop, get status |
| `feature-controls.js` | obstacle avoidance, obstacle images, child lock, auto-empty interval |
| `quirks.js` | list quirks, get/set quirk by UUID |
| `consumables.js` | get consumable remaining life |

---

## Valetudo API Endpoints (Custom Capabilities)

All at `http://<vacuum-ip>:80/api/v2/robot/capabilities/`

### VideoStreamCapability

| Method | Path | Body / Notes |
|---|---|---|
| GET | `/VideoStreamCapability` | Stream status: `{active, quality, pid, go2rtcPid}` |
| GET | `/VideoStreamCapability/urls` | `{rtsp, webrtc, hls, go2rtcApi}` |
| GET | `/VideoStreamCapability/quality` | `{quality: "high"|"low"}` |
| PUT | `/VideoStreamCapability` | `{"action":"start"}` |
| PUT | `/VideoStreamCapability` | `{"action":"stop"}` |
| PUT | `/VideoStreamCapability` | `{"action":"set_quality","value":"high"}` |

### TextToSpeechCapability

| Method | Path | Body / Notes |
|---|---|---|
| GET | `/TextToSpeechCapability` | `{speaking, currentText, language}` |
| PUT | `/TextToSpeechCapability` | `{"action":"speak","text":"Hello","language":"en"}` |
| PUT | `/TextToSpeechCapability` | `{"action":"play_file","filePath":"/tmp/audio.wav"}` |
| PUT | `/TextToSpeechCapability` | `{"action":"stop"}` |

### MapManagementCapability

| Method | Path | Body / Notes |
|---|---|---|
| GET | `/MapManagementCapability` | Array of `{id, name, timestamp, isActive}` |
| PUT | `/MapManagementCapability` | `{"action":"save","name":"Ground Floor"}` |
| PUT | `/MapManagementCapability` | `{"action":"load","id":"..."}` — kills ava/ava_agent, waits 3s, polls map |
| PUT | `/MapManagementCapability` | `{"action":"delete","id":"..."}` |
| PUT | `/MapManagementCapability` | `{"action":"rename","id":"...","name":"..."}` |
| GET | `/MapManagementCapability/export/:id` | Downloads `.tar.gz` of floor slot |
| POST | `/MapManagementCapability/import` | Upload `.tar.gz`, `Content-Type: application/octet-stream` |

**Floor data dirs**: `/data/ri`, `/data/map`, `/data/DivideMap`, `/data/config/ava/mult_map.json`
**Storage**: `/data/maploader/<id>/` with `metadata.json`
**Active ID**: `/data/maploader/.active_id`

---

## VacuumStreamer HTTP Bridge (`tts_handler.sh`)

A busybox `tcpsvd` sh daemon running on the vacuum at **port 6971**. Acts as a lightweight proxy/bridge over the Valetudo API with ~50 endpoints. Launched by `/data/_root_postboot.sh`.

### All Endpoints

**Audio/TTS**
- `POST /say` — TTS via Google Translate (text in body or `text=` query)
- `POST /play` / `POST /play_raw` — Play raw PCM (S16_LE 16kHz mono)
- `POST /play_ogg` — Play OGG file by path
- `GET /test` — Play locate sound
- `GET /volume` / `GET /volume/N` — Get/set speaker volume (0-100)
- `GET /mic_volume` / `GET /mic_volume/N` — Get/set microphone gain

**Basic Control**
- `GET /status` — Vacuum state, battery, mode, fan, water
- `GET /start`, `/stop`, `/pause`, `/home` — Basic vacuum commands

**Cleaning**
- `GET /segments` — List map segments (rooms)
- `POST /segments/clean` — `{"segment_ids":["1","2"]}` — Room cleaning
- `POST /goto` — `{"x":N,"y":N}` — Navigate to map coordinates (GoToLocationCapability)
- `GET /location` — Current robot X,Y position

**Settings**
- `GET /mode` / `GET /mode/MODE` — Get/set op mode (`vacuum`, `mop`, `vacuum_and_mop`)
- `GET /fan_speed` / `GET /fan_speed/SPEED` — Get/set (`low`, `medium`, `high`, `max`)
- `GET /water_usage` / `GET /water_usage/LEVEL` — Get/set (`min`, `low`, `medium`, `high`, `max`)
- `GET /dnd` / `PUT /dnd` — Get/set Do Not Disturb schedule

**Drive (manual control)**
- `GET /drive/enable` / `/drive/disable` — Enable/disable HighResolutionManualControl
- `POST /drive/move` — `{"velocity":-1..1,"angle":-180..180}`
- `GET /drive/speed` / `/drive/speed/N` — Get/set drive speed 0-100%

**Video**
- `GET /video_quality` / `/video_quality/PROFILE` — Get/set video quality (`low`, `high`)

**Feature Toggles**
- `GET /carpet_mode` / `/carpet_mode/MODE` — Get/set (`off`, `avoid`, `lift`)
- `GET /obstacle_images[/enable|/disable]` — Obstacle image detection
- `GET /obstacle_avoidance[/enable|/disable]` — Obstacle avoidance
- `GET /child_lock[/enable|/disable]` — Key lock
- `GET /auto_empty_interval[/INTERVAL]` — Get/set (`normal`, `frequent`, `every_clean`)

**Quirks**
- `GET /quirks` — List all quirks with current values
- `POST /quirks` — `{"id":"uuid","value":"option"}` — Set a quirk
- `GET /quirk/ID` — Get single quirk value by UUID

**Statistics & Consumables**
- `GET /statistics` — Total and current cleaning stats (area, duration, count)
- `GET /consumables` — Remaining life for all consumables

**AI/Detection (from DivideAI)**
- `GET /obstacle_photos` — List obstacle detection JPEGs with timestamp/angle/confidence
- `GET /obstacle_photos/FILE` — Single photo as base64 JSON
- `GET /floor_types` — Floor material detection per room (`ai_floors_large.txt`)
- `GET /room_types` — Room type classifications (`ai_rooms_large.txt`)

---

## Home Assistant Integration

### Connection Info

- **HA Version**: 2026.3.2 on `192.168.1.106:2224`
- **SSH**: `sshpass -p '<HA_PASSWORD>' ssh -o StrictHostKeyChecking=no -o PreferredAuthentications=password -o PubkeyAuthentication=no -o IdentitiesOnly=yes -p 2224 hassio@192.168.1.106`
- **Supervisor API**: from inside SSH: `curl -s -H "Authorization: Bearer $SUPERVISOR_TOKEN" http://supervisor/core/api/...`
- **Supervisor token**: `cat /proc/$(ps aux | grep 'python3.*homeassistant' | grep -v grep | awk '{print $1}')/environ 2>/dev/null | tr '\0' '\n' | grep SUPERVISOR_TOKEN`
- **HA restart**: `curl -X POST -H "Authorization: Bearer $SUPERVISOR_TOKEN" http://supervisor/core/restart`
- **Scripts reload**: `curl -s -X POST -H "Authorization: Bearer $SUPERVISOR_TOKEN" -H "Content-Type: application/json" http://supervisor/core/api/services/script/reload`
- **SSH rate limiting**: wait 8-10s between reconnects if "Permission denied"

### Key Config Files (on HA)

- `/config/scripts.yaml` — All vacuum scripts
- `/config/configuration.yaml` — REST commands, sensors, input_selects
- `/config/.storage/lovelace.dashboard_cleaning` — Vacuum control dashboard (storage-mode)

### Generator Scripts (run locally, push to HA)

| Script | Generates |
|---|---|
| `update_ha_scripts.py` | `scripts.yaml` — vacuum control scripts |
| `update_ha_automations.py` | Quirk sync automations (6 quirks + startup), alarm sentry automations |
| `update_ha_config.py` | REST commands, sensors, input_selects (carpet mode, auto-empty, 6 quirk selectors, drive speed) |

### HA Packages

- `packages/vacuum_sentry.yaml` — Alarm sentry: on alarm trigger → navigate to sensor location + TTS alert + mobile notify → on disarm → return home + TTS all-clear
  - `rest_command.vacuum_goto`
  - `input_boolean.vacuum_sentry_enabled`
  - `input_text.vacuum_sentry_locations` (JSON map of sensor → `{x,y,name}`)

### Dashboard Features

- **Hold-to-move**: Direction buttons use `hold_action: {action: repeat, repeat_delay: 300}` (fires every 300ms while held)
- **Joystick**: HA iframe card pointing at `http://192.168.1.31/joystick.html`
- **Drive mode toggle**: `tap_action` → `vacuum_drive_enable` (sets fan=low, water=min, mode=vacuum before enabling); `hold_action` → `vacuum_drive_disable`
- **Quirk selectors**: 6 `input_select` entities with sync automations
- **Feature toggles**: obstacle avoidance, obstacle images, child lock
- **Dock actions**: auto-repair, drain tank, cleaning cycle, water hookup test (via quirk triggers)
- **Statistics card**, **consumables card**, **camera card** (go2rtc → entity `camera.192_168_1_31`)

### Key Details

- **Angle convention**: positive = clockwise = right turn, negative = left turn
- **Camera entity**: `camera.192_168_1_31`, RTSP `rtsp://192.168.1.31:8554/vacuum`, still `http://192.168.1.31:1984/api/frame.jpeg?src=vacuum`
- **HA 2024.10+**: `camera: platform: generic` YAML is silently ignored — use UI config flow
- **Drive mode**: mode=vacuum causes mop to retract. Dreame has no "off" fan/water preset; `low`/`min` is minimum.
- **Valetudo keep-alive**: sends `{velocity:0,angle:0}` every 700ms — robot stops within 700ms after commands stop

---

## Prerequisites on Vacuum

- `/data/vacuumstreamer/vacuumstreamer.so` — LD_PRELOAD shim
- `/data/vacuumstreamer/go2rtc` — go2rtc binary
- `/data/vacuumstreamer/go2rtc.yaml` — go2rtc config
- `/data/vacuumstreamer/tts_handler.sh` — HTTP bridge daemon (started by `_root_postboot.sh` via `tcpsvd` on port 6971)
- `ffmpeg` (optional, for TTS audio format conversion)

---

## Syncing with Upstream Valetudo

```bash
git remote add upstream https://github.com/Hypfer/Valetudo.git
git fetch upstream
git merge upstream/master
# Only 5 upstream files have our code (1 line each) — conflicts are very unlikely
```

---

## Known Harmless Warnings

- `"unknown water grade"` — pre-existing upstream noise during AVA restart
- `"misc tunables"` — pre-existing upstream noise
