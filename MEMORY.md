# Project Memory Index

Last updated: 2026-07-23

## Repositories

| Component | Location | Active branch | Remote |
|---|---|---|---|
| Valetudo parent | `/Users/mattjoslin/Documents/GitHub/Valetudo` | `master` | `Chorty/Valetudo` via `fork` |
| VacuumStreamer plugin | `vacuumstreamer-plugin/` | parent-pinned at `c32f847` (remote `main` merge `194236c`) | `Chorty/valetudo-vacuumstreamer-plugin` |
| Native companion | `/Users/mattjoslin/Documents/GitHub/vacuumstreamer` | `feature/alarm-sentry` | `Chorty/vacuumstreamer` |

The native companion's former untracked backups, extracted device data, and build artifacts were moved intact to `/Users/mattjoslin/Documents/GitHub/vacuumstreamer_local_archive_20260721_222234`. Its 16,330-entry manifest has SHA-256 `2fff74550715713760b9ca9c5bb07ff434e1c86e296e0b44a26d6ea9df0712ec`.

## Deployed Baseline

- GUI resource/observability PR: `Chorty/Valetudo#7`, merge SHA `6a8829ea02257bd8d3314d0d9052655e21f8056f`
- Static MIME hotfix PR: `Chorty/Valetudo#8`, final merge SHA `f1e5a1575df4e472aa98ade4ade4cde7d5b50fb0`
- Exact-SHA GitHub Actions build: run `30062082320`
- Active ARM64 binary SHA-256: `6d9f1ed543a37c261a8ffd2da675c2a47c3e073775c9852b0a5d4b82ac7d74a5`
- Verified local backup package: `/Users/mattjoslin/Documents/ValetudoBackups/valetudo_f1e5a157_20260723_224321`
- Backup archive SHA-256: `0ae1689204a0d9b4e95203fdc127d23952f984fe58b167461d1401895aaf37f8`
- Immediate on-device rollback binary: `/data/valetudo.predeploy_f1e5a157`
- Earlier on-device rollback binary: `/data/valetudo.predeploy_6a8829ea`
- Robot access: `ssh vacuum` using the private key configured outside Git

## Verified Integration State

- Filesystem protections and joystick fail-safes are fixed and deployed.
- Root/API HTTP, static Brotli/MIME/cache headers, MQTT connectivity, MCP read-only tools, map management, state SSE, joystick zero-motion/disable, AVA priority, and initial watchdog stability have passed for the `f1e5a157` deployment.
- The corrected 120-sample docked/video-on profile is in `/Users/mattjoslin/Documents/ValetudoProfiles/2026-07-24T03-34-33-541Z_after-f1e5a157-docked-video-on-maploader-fix_AcWD9N`. It had zero HTTP failures, 484036 KB minimum available memory, and a 232.6 ms root p95. That misses the formal 150 ms docked target even though browser-like keep-alive root p95 was 30.4 ms and on-device localhost requests took 10–20 ms. There is no valid ten-minute pre-change baseline.
- The active HLS master playlist returns HTTP 200. Authenticated Home Assistant entity verification, a user-approved video stop/start check, and the docked-video-off plus two user-started-cleaning profiles are still pending for this deployment. The vacuum is currently docked and idle; do not start cleaning or change video state without user coordination.
- MCP runs locally over stdio, targets the robot over the private LAN, applies bounded request timeouts, supports optional paired Basic Auth variables, and advertises 49 tools.
- The ineffective video-quality selector and its API/MCP tools were removed.
- The previous baseline showed 52 Home Assistant entities for `Vacuum CleanusMaximus` through MQTT, MQTT Vacuum Camera, and Valetudo. Reconfirm those authenticated UI details before recording final acceptance for `f1e5a157`.
- The GUI resource/observability and static MIME hotfix branches remain intentionally retained until final acceptance. The native companion `feature/alarm-sentry` fixes through `6ab9a50` are published.
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
