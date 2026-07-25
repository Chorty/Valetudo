# Project Memory Index

Last updated: 2026-07-24

## Repositories

| Component | Location | Active branch | Remote |
|---|---|---|---|
| Valetudo parent | `/Users/mattjoslin/Documents/GitHub/Valetudo` | `agent/final-gui-resource-acceptance` (targets `master`) | `Chorty/Valetudo` via `fork` |
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
- Root/API HTTP, static Brotli/MIME/cache headers, MQTT connectivity, authenticated Home Assistant configuration/entity/state checks, MCP read-only tools, map management, state SSE, joystick zero-motion/disable, authorized API video stop/start/HLS, and AVA priority have passed for the `f1e5a157` deployment. Post-profile inspection found AVA healthy, the Valetudo PID stable across every sample, and no new watchdog restart, kernel OOM, segfault, or AVA fault record.
- The corrected 120-sample docked/video-on profile is in `/Users/mattjoslin/Documents/ValetudoProfiles/2026-07-24T03-34-33-541Z_after-f1e5a157-docked-video-on-maploader-fix_AcWD9N`. It had zero HTTP failures, 484036 KB minimum available memory, and a 232.6 ms root p95. That misses the formal 150 ms docked target even though browser-like keep-alive root p95 was 30.4 ms and on-device localhost requests took 10–20 ms. There is no valid ten-minute pre-change baseline.
- Three approved five-minute profiles were added: docked/video-off `2026-07-25T00-39-52-906Z_after-f1e5a157-docked-video-off-5min_wDWLQI` (zero failures, root p95 356.7 ms), cleaning/video-off `2026-07-25T00-27-17-801Z_after-f1e5a157-cleaning-video-off-5min_ru60LH` (zero failures, root p95 890.0 ms), and cleaning/video-on `2026-07-25T00-33-14-644Z_after-f1e5a157-cleaning-video-on-5min_eKYuWp` (zero failures, root p95 1205.9 ms). The video-on run contains 52 cleaning samples followed by eight return-to-dock samples.
- The shortened runs are useful operational evidence but do not satisfy the original ten-minute requirement. Both cleaning profiles miss the 500 ms target and both docked profiles miss the 150 ms target, so the four-scenario benchmark is not formally signed off. No 500 ms slow-request warnings were observed in the inspected, rate-limited server log; that supports but does not prove the LAN/connection-overhead diagnosis.
- Across matched cleaning subsets, video-on coincided with about 9.6 aggregate CPU percentage points for `video_monitor`, 1.1 for go2rtc, roughly 30 MB process RSS, and a root-p95 increase from 1069.7 to 1369.6 ms. The sequential runs do not prove causation. AVA/Valetudo CPU and RSS stayed within 10%, all measured requests succeeded, minimum available memory remained 433824 KB, and process priority remained AVA nice 0 versus Valetudo/video nice 10.
- Home Assistant shows MQTT, MQTT Vacuum Camera, and Valetudo configured on the same 52-entity device without failed setup. HA reflected the authorized API video stop/start, and a temporary encoded HLS sample measured an effective rate of about 15.02 FPS. HA-originated TTS, dock, maploader, and other state-changing commands were not exercised. The only integration-adjacent configuration issue found is that all four triggers inside `Vacuum Nightly Front Room Vacuum 11:30` are disabled, so that automation cannot run on schedule until they are re-enabled.
- At the end of acceptance, the vacuum was docked and idle with video restored on. Do not start cleaning or send movement commands without user coordination.
- MCP runs locally over stdio, targets the robot over the private LAN, applies bounded request timeouts, supports optional paired Basic Auth variables, and advertises 49 tools.
- The ineffective video-quality selector and its API/MCP tools were removed.
- The GUI resource/observability and static MIME hotfix branches remain intentionally retained while PR #9 is a draft and the formal benchmark gap remains. The native companion `feature/alarm-sentry` fixes through `6ab9a50` are published.
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
