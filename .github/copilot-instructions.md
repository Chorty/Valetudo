# Valetudo Fork — VacuumStreamer Plugin

## Project Overview

This is a fork of [Valetudo](https://github.com/Hypfer/Valetudo) with added capabilities for the **Dreame L10S Pro Ultra Heat** vacuum:

- **VideoStreamCapability** — Manages the video pipeline (vacuumstreamer.so LD_PRELOAD + go2rtc) to expose RTSP/WebRTC/HLS streams from the vacuum's camera
- **TextToSpeechCapability** — Google Translate TTS engine that speaks through the vacuum's speaker

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

1. `backend/lib/core/capabilities/index.js` — Added VideoStreamCapability, TextToSpeechCapability exports
2. `backend/lib/webserver/capabilityRouters/index.js` — Added router exports
3. `backend/lib/webserver/CapabilitiesRouter.js` — Added TYPE→Router mapping entries
4. `backend/lib/robots/dreame/capabilities/index.js` — Added Dreame implementation exports
5. `backend/lib/robots/dreame/DreameL10SProUltraHeatValetudoRobot.js` — Registered new capabilities

### Files Added (plugin-only, no upstream conflict)

1. `backend/lib/core/capabilities/VideoStreamCapability.js` — Abstract capability
2. `backend/lib/core/capabilities/TextToSpeechCapability.js` — Abstract capability
3. `backend/lib/robots/dreame/capabilities/DreameVideoStreamCapability.js` — Dreame implementation
4. `backend/lib/robots/dreame/capabilities/DreameTextToSpeechCapability.js` — Dreame implementation
5. `backend/lib/webserver/capabilityRouters/VideoStreamCapabilityRouter.js` — HTTP router
6. `backend/lib/webserver/capabilityRouters/TextToSpeechCapabilityRouter.js` — HTTP router

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

## Syncing with Upstream Valetudo

```bash
git remote add upstream https://github.com/Hypfer/Valetudo.git
git fetch upstream
git merge upstream/master
# Resolve conflicts only in the 5 modified files listed above
```

## Prerequisites on Vacuum

- `vacuumstreamer.so` compiled and placed at `/data/vacuumstreamer/`
- `go2rtc` binary at `/data/vacuumstreamer/go2rtc`
- `go2rtc.yaml` config at `/data/vacuumstreamer/go2rtc.yaml`
- `ffmpeg` (optional, for TTS audio conversion)

## Branch

- `feature/vacuumstreamer-plugin` — All plugin work lives here
