# Project Memory Index

Last updated: 2026-07-26

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
- The 120-sample docked/video-on profile is in `/Users/mattjoslin/Documents/ValetudoProfiles/2026-07-24T03-34-33-541Z_after-f1e5a157-docked-video-on-maploader-fix_AcWD9N`. It had zero HTTP failures, 484036 KB minimum available memory, and a 232.6 ms root p95. There is no valid ten-minute pre-change baseline.
- **The latency gap was a measurement artifact, not a GUI regression.** The profiler issued its SSH `/proc` scan and 3–5 HTTP requests in one `Promise.all`, so every historical `root_ms` recorded the robot serving the profiler's own concurrent burst. Reproduced 2026-07-25 docked/video-on: root alone 32–80 ms, +SSH scan 63–173 ms, +2 concurrent API calls 124–205 ms (matches the recorded 155.9 ms non-extended p50), +full extended burst 183–589 ms (matches the recorded 232.6 ms p95). Keep-alive root was 30.4 ms and on-device localhost 10–20 ms.
- The profiler now measures `root_isolated_ms` alone before the burst. `root_isolated_ms` carries the absolute gate (p95 ≤ 150 ms docked, ≤ 500 ms cleaning); `root_ms` is regression-gated only. `samples.csv` also gained `extended`, `map_ms`, and `javascript_ms`.
- Three approved five-minute profiles were added: docked/video-off `2026-07-25T00-39-52-906Z_after-f1e5a157-docked-video-off-5min_wDWLQI` (zero failures, root p95 356.7 ms), cleaning/video-off `2026-07-25T00-27-17-801Z_after-f1e5a157-cleaning-video-off-5min_ru60LH` (zero failures, root p95 890.0 ms), and cleaning/video-on `2026-07-25T00-33-14-644Z_after-f1e5a157-cleaning-video-on-5min_eKYuWp` (zero failures, root p95 1205.9 ms). The video-on run contains 52 cleaning samples followed by eight return-to-dock samples.
- Two ten-minute docked runs under the corrected metric both pass the 150 ms gate with zero HTTP failures: video-on `2026-07-25T03-35-49-686Z_corrected-docked-video-on_lObcm0` (`root_isolated_ms` p95 81.9 ms, burst p95 166.5 ms, 554300 KB minimum memory) and video-off `2026-07-25T03-49-39-677Z_corrected-docked-video-off_iLEV6V` (p95 88.8 ms, burst p95 158.8 ms, 572748 KB). Video-on costs ~3.6 CPU points for `video_monitor`, ~18 MB memory, and 8% peak load; latency differs by under 8% in both directions. The video-off run was captured during LAN reconfiguration and shows no contamination (isolated max 126.0 ms, no sample above 300 ms).
- Two user-accepted five-minute corrected cleaning runs completed on 2026-07-26 with 60/60 pure cleaning samples and zero HTTP failures. Video-on `2026-07-26T03-59-03-898Z_corrected-cleaning-video-on-5min_iNx4cH` had isolated p50/p95/max 146.0/617.5/806.1 ms, burst p95 1412.3 ms, and 420412 KB minimum memory. Video-off `2026-07-26T04-08-22-092Z_corrected-cleaning-video-off-5min_1XsvUn` had 106.5/554.0/1377.7 ms, burst p95 1193.1 ms, and 441160 KB minimum memory. Matched historical burst p95 regressions were 7.0% on and 12.7% off, inside the 20% gate; PIDs/watchdog remained stable. Both runs fail the absolute 500 ms cleaning gate, so four-scenario coverage is complete but cleaning-latency acceptance does not pass. Video changes isolated p95 by only ~11.5%, so it is not the primary cause.
- The robot rebooted at ~03:10 UTC on 2026-07-25 because of stock Dreame nightly maintenance, not Valetudo, the LAN work, or a fault: cron runs `/usr/bin/check_restart_ava.sh` at 03:00 UTC, which waits a random 0–7200 s, requires the robot to be idle, then reboots and reports cloud code 203. All three boots in `/data/log/fds.log` (Jul 22 04:45, Jul 23 03:14, Jul 25 03:11 UTC) fall in that window. Creating `/data/initialize.sh` would disable it; this was not done. Expect this reboot on idle nights. `/sys/fs/pstore` was empty, no panic or OOM was recorded, and AVA/watchdog/`sys_monitor` returned normally. Both corrected runs were captured 24 and 38 minutes after that boot, so their absolute latency and memory figures are not like-for-like against the ~2-day-uptime historical runs (553–573 MB available after reboot versus 423 MB before). The isolated-versus-burst finding is unaffected, being an intra-sample comparison (isolated p50 32.6 ms versus burst p50 116.1 ms in the same samples).
- TTS and map management were verified directly against the Valetudo API on 2026-07-25: `speak` returns 200 after awaiting real playback (5.19 s, logged), a concurrent poll shows `speaking: true` with `currentText`, `stop` cancels an in-flight job, and map list/export/save/rename all succeed with the active slot and docked state unchanged. `load` and `delete` were not exercised, and all test artifacts were cleaned up.
- The shortened historical runs remain valid operational evidence — zero HTTP failures, healthy memory and CPU — and their latency figures are explained by the burst artifact above rather than anomalous. No 500 ms slow-request warnings appeared in the inspected, rate-limited server log.
- Across matched cleaning subsets, video-on coincided with about 9.6 aggregate CPU percentage points for `video_monitor`, 1.1 for go2rtc, roughly 30 MB process RSS, and a root-p95 increase from 1069.7 to 1369.6 ms. The sequential runs do not prove causation. AVA/Valetudo CPU and RSS stayed within 10%, all measured requests succeeded, minimum available memory remained 433824 KB, and process priority remained AVA nice 0 versus Valetudo/video nice 10.
- Home Assistant shows MQTT, MQTT Vacuum Camera, and Valetudo configured on the same 52-entity device without failed setup. On 2026-07-26 the authorized HA→MQTT→Valetudo path passed video off/on, TTS plus Stop Audio, mop drying start/stop, mop-dock cleaning start/stop, auto-empty, and maploader `main`. Maploader published to `valetudo/CleanusMaximus/maploader/map/set`; the 11-slot list, active `6_rooms_071826_mrqdwbmr` slot, and active-map checksum remained unchanged. One first-attempt mop-clean request coincided with a Valetudo MQTT keepalive timeout; the dock stayed idle, Valetudo reconnected automatically, entities recovered after about three seconds, and stable retries passed. The only integration-adjacent configuration issue still known is that all four triggers inside `Vacuum Nightly Front Room Vacuum 11:30` are disabled.
- At the end of acceptance, the vacuum was docked and idle at 100% with video restored on, TTS idle, MQTT ready, all relevant PIDs stable, and the watchdog running. Do not start cleaning or send movement commands without user coordination.
- MCP runs locally over stdio, targets the robot over the private LAN, applies bounded request timeouts, supports optional paired Basic Auth variables, and advertises 49 tools.
- The ineffective video-quality selector and its API/MCP tools were removed.
- The GUI resource/observability and static MIME hotfix branches remain intentionally retained while PR #9 is open and the cleaning-latency gate remains failed. The native companion `feature/alarm-sentry` fixes through `6ab9a50` are published.
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
