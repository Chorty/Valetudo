# Project Memory Index

Last updated: 2026-07-18

## Repositories

| Component | Location | Active branch | Remote |
|---|---|---|---|
| Valetudo parent | `/Users/mattjoslin/Documents/GitHub/Valetudo` | `master` | `Chorty/Valetudo` via `fork` |
| VacuumStreamer plugin | `vacuumstreamer-plugin/` | `main` | `Chorty/valetudo-vacuumstreamer-plugin` |
| Native companion | `/Users/mattjoslin/Documents/GitHub/vacuumstreamer` | `feature/alarm-sentry` | `Chorty/vacuumstreamer` |

The native companion has local backups, extracted device data, and build artifacts that are intentionally untracked. They are not source changes and must not be added wholesale.

## Deployed Baseline

- Valetudo merge SHA: `52877d808d5b2cdbe48e62b167580e615bd1fb4b`
- Active binary SHA-256: `e7adc3e340958fed0189a5c03096443e88c7c471bba7e2b28556a421c6d160a0`
- Verified local backup: `/Users/mattjoslin/Documents/GitHub/vacuumstreamer/robot_backup_20260716_213135`
- Backup SHA-256: `7c9f135d72c2db4a0a0b6942df058b4d50fd2e13d2c918d11bad8ae5d22b3af2`
- Robot access: `ssh vacuum` using the private key configured outside Git

## Verified Integration State

- Filesystem protections and joystick fail-safes are fixed and deployed.
- Video start/stop, stream URLs, HLS playback, map management, locate, clean-stop, root/API health, and watchdog stability passed acceptance testing.
- MCP runs locally over stdio, targets the robot over the private LAN, applies bounded request timeouts, supports optional paired Basic Auth variables, and advertises 49 tools.
- The ineffective video-quality selector and its API/MCP tools were removed.
- Home Assistant sees `Vacuum CleanusMaximus` through MQTT, MQTT Vacuum Camera, and Valetudo; the latest check showed docked, idle, no error, 100% battery, and a stable MQTT connection.
- Current source work adds native MQTT/Home Assistant discovery for plugin TTS/video controls, mop-dock actions, and robot quirks.

## Documentation Map

- `CLAUDE.md` — primary integration and operations guide
- `.github/copilot-instructions.md` — concise coding-agent guardrails
- `mcp-server/README.md` — MCP setup, environment variables, tunnel, and tools
- `vacuumstreamer-plugin/README.md` — plugin MQTT/Home Assistant entities
- `/Users/mattjoslin/Documents/GitHub/vacuumstreamer/README.md` — native VacuumStreamer documentation

## Next-Session Checklist

1. Check status in all three repositories and inspect the plugin submodule separately.
2. Fetch before claiming branches are current; do not infer remote state from local tracking refs.
3. Run tests appropriate to every changed component.
4. Commit plugin changes before the parent submodule pointer.
5. Do not deploy without a new checked backup and automatic rollback.
