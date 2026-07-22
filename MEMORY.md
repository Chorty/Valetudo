# Project Memory Index

Last updated: 2026-07-21

## Repositories

| Component | Location | Active branch | Remote |
|---|---|---|---|
| Valetudo parent | `/Users/mattjoslin/Documents/GitHub/Valetudo` | `master` | `Chorty/Valetudo` via `fork` |
| VacuumStreamer plugin | `vacuumstreamer-plugin/` | parent-pinned at `c32f847` (remote `main` merge `194236c`) | `Chorty/valetudo-vacuumstreamer-plugin` |
| Native companion | `/Users/mattjoslin/Documents/GitHub/vacuumstreamer` | `feature/alarm-sentry` | `Chorty/vacuumstreamer` |

The native companion's former untracked backups, extracted device data, and build artifacts were moved intact to `/Users/mattjoslin/Documents/GitHub/vacuumstreamer_local_archive_20260721_222234`. Its 16,330-entry manifest has SHA-256 `2fff74550715713760b9ca9c5bb07ff434e1c86e296e0b44a26d6ea9df0712ec`.

## Deployed Baseline

- Valetudo PR: `Chorty/Valetudo#6`, merged with a merge commit
- Valetudo merge SHA: `1c0f5b9fdb6de5492f6f6e9acb1df006c12674ff`
- Exact-SHA GitHub Actions build: run `29884181662`
- Active ARM64 binary SHA-256: `95fe4ea4f6023acaef191a7a3a732efbcc70ca7254f3a5cf4d0d5466c775a0b9`
- Verified local backup: `/Users/mattjoslin/Documents/GitHub/vacuumstreamer_local_archive_20260721_222234/robot_backup_20260721_215739`
- Backup SHA-256: `65b3ca8e377428602825cb48bde3b9ab91adafe39e907fff9f9e6184c5832007`
- On-device rollback binary: `/data/valetudo.predeploy_1c0f5b9f`
- Robot access: `ssh vacuum` using the private key configured outside Git

## Verified Integration State

- Filesystem protections and joystick fail-safes are fixed and deployed.
- Root/API HTTP, MQTT/Home Assistant, MCP, map management, joystick zero-motion/disable, video start/stop with HLS playback, and watchdog stability passed final acceptance testing.
- MCP runs locally over stdio, targets the robot over the private LAN, applies bounded request timeouts, supports optional paired Basic Auth variables, and advertises 49 tools.
- The ineffective video-quality selector and its API/MCP tools were removed.
- Home Assistant sees `Vacuum CleanusMaximus` through MQTT, MQTT Vacuum Camera, and Valetudo; the final check showed 52 entities, docked/idle state, no error, 100% battery, and available video controls.
- Parent and plugin integration feature branches were deleted locally and remotely after successful deployment. The native companion `feature/alarm-sentry` fixes through `6ab9a50` are published.
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
