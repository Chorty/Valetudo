# Valetudo Fork — VacuumStreamer Plugin

## Project Overview

This is a fork of [Valetudo](https://github.com/Hypfer/Valetudo) (v2026.02.0) with added capabilities for the **Dreame L10S Pro Ultra Heat** vacuum:

- **VideoStreamCapability** — Manages the video pipeline (vacuumstreamer.so LD_PRELOAD + go2rtc) to expose RTSP/WebRTC/HLS streams from the vacuum's camera
- **TextToSpeechCapability** — Google Translate TTS engine that speaks through the vacuum's speaker
- **MapManagementCapability** — "Floor Management" — file-swap based floor slot backup/restore with isActive tracking

## Robot & Environment

- **Robot**: Dreame L10S Pro Ultra Heat, model r9302, FW 1574, aarch64, IP `192.168.1.31`
- **SSH key**: `/Users/mattjoslin/Documents/GitHub/vacuumstreamer/privatekeybc3a.id_rsa`
- **Source**: `/Users/mattjoslin/Documents/GitHub/Valetudo/`
- **Fork**: `chorty/Valetudo`, branch `feature/vacuumstreamer-plugin`, last commit `c437bcd2`
- **blockExternalAccess**: true — test API via `ssh ... 'wget -qO- http://127.0.0.1:80/...'`
- **Watchdog**: `/data/valetudo_watchdog.sh` (while-true respawn), launched by `/data/_root_postboot.sh`
- **Currently deployed**: frontend `main.45f0b334.js`, binary MD5 `c6620c51a011a10a050cdf1ee68a622b`

## Build & Deploy

```bash
# 1. Fix ajv dep conflict (required before every frontend build)
cd /Users/mattjoslin/Documents/GitHub/Valetudo
cd node_modules/ajv-keywords && npm install ajv@^8.8.2 --no-save && cd ../..

# 2. Build frontend
npm run build --workspace=frontend

# 3. Build aarch64 binary (output: build/aarch64/valetudo — root level, NOT backend/build/)
npm run build_aarch64 --workspace=backend

# 4. Deploy (watchdog auto-restarts valetudo, takes ~17-20s)
cat build/aarch64/valetudo | ssh -i /Users/mattjoslin/Documents/GitHub/vacuumstreamer/privatekeybc3a.id_rsa root@192.168.1.31 \
  "cat > /tmp/valetudo_new && chmod +x /tmp/valetudo_new && mv /tmp/valetudo_new /data/valetudo && killall valetudo"
```

## Architecture

All customizations follow Valetudo's native **Capability** pattern:

```
Core Capability (abstract)           → backend/lib/core/capabilities/
  └── Dreame Implementation          → backend/lib/robots/dreame/capabilities/
Capability Router (HTTP API)         → backend/lib/webserver/capabilityRouters/
CapabilitiesRouter (route mapping)   → backend/lib/webserver/CapabilitiesRouter.js
Robot Registration                   → backend/lib/robots/dreame/DreameL10SProUltraHeatValetudoRobot.js
```

### Files Modified from Upstream Valetudo

Keep these to a **minimum** to reduce merge conflicts:

1. `backend/lib/core/capabilities/index.js` — Added VideoStreamCapability, TextToSpeechCapability, MapManagementCapability exports
2. `backend/lib/webserver/capabilityRouters/index.js` — Added router exports
3. `backend/lib/webserver/CapabilitiesRouter.js` — Added TYPE→Router mapping entries
4. `backend/lib/robots/dreame/capabilities/index.js` — Added Dreame implementation exports
5. `backend/lib/robots/dreame/DreameL10SProUltraHeatValetudoRobot.js` — Registered new capabilities
6. `frontend/src/api/types.ts` — Added Capability.MapManagement, MapManagementMapEntry, MapManagementCommand
7. `frontend/src/api/client.ts` — Added MapManagement fetch/mutation functions
8. `frontend/src/api/hooks.ts` — Added MapManagement query/mutation hooks
9. `frontend/src/robot/RobotRouter.tsx` — Added `map_management_capability` route
10. `frontend/src/components/ValetudoAppBar.tsx` — Added "Floor Management" nav item

### Files Added (plugin-only, no upstream conflict)

1. `backend/lib/core/capabilities/VideoStreamCapability.js` — Abstract capability
2. `backend/lib/core/capabilities/TextToSpeechCapability.js` — Abstract capability
3. `backend/lib/core/capabilities/MapManagementCapability.js` — Abstract capability (TYPE = "MapManagementCapability")
4. `backend/lib/robots/dreame/capabilities/DreameVideoStreamCapability.js` — Dreame implementation
5. `backend/lib/robots/dreame/capabilities/DreameTextToSpeechCapability.js` — Dreame implementation
6. `backend/lib/robots/dreame/capabilities/DreameMapManagementCapability.js` — File-swap floor switcher
7. `backend/lib/webserver/capabilityRouters/VideoStreamCapabilityRouter.js` — HTTP router
8. `backend/lib/webserver/capabilityRouters/TextToSpeechCapabilityRouter.js` — HTTP router
9. `backend/lib/webserver/capabilityRouters/MapManagementCapabilityRouter.js` — HTTP router
10. `frontend/src/robot/capabilities/MapManagementCapability.tsx` — "Floor Management" React page

## MapManagementCapability Details

- **Storage**: `/data/maploader/` on vacuum; active slot tracked via `/data/maploader/.active_id`
- **Map dirs swapped on load**: `/data/ri`, `/data/map`, `/data/DivideMap`
- **After load**: kills ava/ava_agent, waits 3s, calls `robot.clearValetudoMap()` + `robot.pollMap()`
- **isActive**: `getMapList()` returns `isActive: true` on the active slot
- **UI**: Active floor Alert banner, green "Active" chip, "Switch Floor" confirmation dialog
- **Note**: Uses safe file-swap approach — does NOT use native Dreame multi-map (cloud-dependent, risky)

## API Endpoints

Once deployed, these endpoints are available at `http://<vacuum-ip>:80/api/v2/robot/capabilities/`:

### VideoStreamCapability
| Method | Path | Description |
|--------|------|-------------|
| GET | `/VideoStreamCapability` | Get stream status (active, quality, PIDs) |
| GET | `/VideoStreamCapability/urls` | Get stream URLs (RTSP, WebRTC, HLS) |
| GET | `/VideoStreamCapability/quality` | Get current video quality |
| PUT | `/VideoStreamCapability` | `{"action": "start"}` — Start stream pipeline |
| PUT | `/VideoStreamCapability` | `{"action": "stop"}` — Stop stream pipeline |
| PUT | `/VideoStreamCapability` | `{"action": "set_quality", "value": "high"}` — Set quality |

### TextToSpeechCapability
| Method | Path | Description |
|--------|------|-------------|
| GET | `/TextToSpeechCapability` | Get TTS status |
| PUT | `/TextToSpeechCapability` | `{"action": "speak", "text": "Hello", "language": "en"}` |
| PUT | `/TextToSpeechCapability` | `{"action": "play_file", "filePath": "/tmp/audio.wav"}` |
| PUT | `/TextToSpeechCapability` | `{"action": "stop"}` — Stop playback |

### MapManagementCapability
| Method | Path | Description |
|--------|------|-------------|
| GET | `/MapManagementCapability` | List floor slots (includes `isActive`) |
| PUT | `/MapManagementCapability` | `{"action": "save", "name": "..."}` — Save current map to new slot |
| PUT | `/MapManagementCapability` | `{"action": "load", "id": "..."}` — Load slot (triggers AVA restart) |
| PUT | `/MapManagementCapability` | `{"action": "delete", "id": "..."}` — Delete slot |
| PUT | `/MapManagementCapability` | `{"action": "rename", "id": "...", "name": "..."}` — Rename slot |
| GET | `/MapManagementCapability/export/:id` | Download slot as `.tar.gz` |
| POST | `/MapManagementCapability/import` | Upload `.tar.gz` slot |

## Home Assistant Integration

- **Scripts**: `/Users/mattjoslin/Documents/GitHub/vacuumstreamer/update_ha_scripts.py`
- **Dreame angle convention**: positive = clockwise = **right** turn, negative = counterclockwise = **left** turn
- `vacuum_drive_left` uses `{{ (... * 180) * -1 }}` (negative angle)
- `vacuum_drive_right` uses `{{ ... * 180 }}` (positive angle)
- After editing `update_ha_scripts.py`, reload Scripts in HA: Developer Tools → YAML → Scripts

## Known Harmless Warnings

- `"unknown water grade"` — pre-existing upstream noise during AVA restart
- `"misc tunables"` — pre-existing upstream noise, not worth fixing

## Syncing with Upstream Valetudo

```bash
git remote add upstream https://github.com/Hypfer/Valetudo.git
git fetch upstream
git merge upstream/master
# Resolve conflicts only in the modified files listed above
```

## Prerequisites on Vacuum

- `vacuumstreamer.so` compiled and placed at `/data/vacuumstreamer/`
- `go2rtc` binary at `/data/vacuumstreamer/go2rtc`
- `go2rtc.yaml` config at `/data/vacuumstreamer/go2rtc.yaml`
- `ffmpeg` (optional, for TTS audio conversion)

## Branch

- `feature/vacuumstreamer-plugin` — All plugin work lives here
