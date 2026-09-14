# Project Memory Index

Last updated: 2026-09-13

## Repositories

| Component | Location | Active branch | Remote |
|---|---|---|---|
| Valetudo parent | `/Users/mattjoslin/Documents/GitHub/Valetudo` | Deployed `feature/vacuumstreamer-switches` (`b589bd6d` plus this documentation); `test/upstream-sync-2026-09` at `5d36af0a`; `master` at `eafdf8e8` | `Chorty/Valetudo` via `fork` |
| VacuumStreamer plugin | `vacuumstreamer-plugin/` | Deployed `feature/runtime-switches` at `20545a8`; `main` merge `194236c` | `Chorty/valetudo-vacuumstreamer-plugin` |
| Native companion | `/Users/mattjoslin/Documents/GitHub/vacuumstreamer` | Deployed `feature/runtime-switches` at `6b60354`, based on unmerged `feature/alarm-sentry` (`6ab9a50`) | `Chorty/vacuumstreamer` |

All four branches above were pushed on 2026-09-13; no pull requests are open for them yet.

The native companion's former untracked backups, extracted device data, and build artifacts were moved intact to `/Users/mattjoslin/Documents/GitHub/vacuumstreamer_local_archive_20260721_222234`. Its 16,330-entry manifest has SHA-256 `2fff74550715713760b9ca9c5bb07ff434e1c86e296e0b44a26d6ea9df0712ec`.

## Deployed Baseline

- Deployed 2026-09-13: Valetudo `b589bd6d2a3c8d006dd6859aa910677e199e6e47` with plugin `20545a8c27f9422612bb514b3780f65a31d6e074`, binary SHA-256 `94b6beb6a8b26d288faaa2345e53b43523bd478c8307d07b16f6b9061bdca1ff`; native VacuumStreamer `6b60354dafcba5dd6e23b6ad3e07ea0a054b382c`
- Backup package: `/Users/mattjoslin/Documents/ValetudoBackups/valetudo_b589bd6d_20260913` (sealed; see `BACKUP_INFO.txt` and `DEPLOY_RECORD.txt`); contains device secrets and SSH keys
- Active since 2026-09-14: Valetudo `0a1c32f6` (plugin `cd18818`), SHA-256 `88d2e284a83a41293e2c51418f2accd577226ac7d1a338afe82bb9bf55e3e21a`, native `1d0b187`; package `/Users/mattjoslin/Documents/ValetudoBackups/valetudo_0a1c32f6_20260914` (sealed, `DEPLOY_RECORD.txt`); rollback: every `*.predeploy_0a1c32f6` file (binary, `_root_postboot.sh`, `/data/vacuumstreamer/*`), then reboot
- Previous: `d2b81c8b` (forced-GC fix), SHA-256 `d813e0ff388fbb70d65469577cd62a4a1e88830983bde6bbb3d6b308110a8a1a`; its rollback is `/data/valetudo.predeploy_d2b81c8b` (see "2026-09-13 Deployment")
- On-device rollback: `/data/valetudo.predeploy_b589bd6d`, `/data/_root_postboot.sh.predeploy_b589bd6d`, `/data/vacuumstreamer/go2rtc.yaml.predeploy_b589bd6d`; copy them back and reboot
- Previous baseline: `f1e5a157`, binary `6d9f1ed543a37c261a8ffd2da675c2a47c3e073775c9852b0a5d4b82ac7d74a5`, Actions run `30062082320`, backup `/Users/mattjoslin/Documents/ValetudoBackups/valetudo_f1e5a157_20260723_224321` (archive `0ae1689204a0d9b4e95203fdc127d23952f984fe58b167461d1401895aaf37f8`)
- Robot access: `ssh vacuum` using the private key configured outside Git

## 2026-09-13 Deployment

- Runtime switches and optional go2rtc login are live; `CAMERA_MODE=on_demand`, login off, everything else on.
- Deployment gates passed: on-robot 60 s binary gate, reboot gate 12/12, runtime commit match, all native files matching `6b60354`.
- Found and fixed during deployment: BusyBox `flock` has no `-w`, which broke camera wakes for about four minutes after the reboot (`07e538d`); timers now use `/proc/uptime` (`07e538d`); stop escalates to KILL (`1fa5383`); the supervisor check uses builtins (`5ff77bc`); IPv6 port parsing (`6b60354`).
- Verified on the robot: idle stop after 180 s, cold wake about 3.6 s, pause and resume through the API, crash recovery under 1.2 s, frozen-process recovery about 27 s.
- Profiles: watched and always-mode pass every gate. With nobody watching, the original supervisor caused a +90%/+68% burst regression; the builtin supervisor passes at +13% and uses 1.35% of one core instead of 3.03%.
- Valetudo CPU rises with uptime (about 4.5% after boot to 8.5–9.7% after 3.5 hours; 36–49% after two days on `f1e5a157`), which predates this deployment. The latest idle profile fails the Valetudo CPU gate only because its baseline was taken 24–38 minutes after boot.
- Root cause (upstream code, still in upstream master): `Valetudo.js` forced a full GC every 2.5 s once RSS exceeded the heap limit + 10 MiB (74 MiB), but RSS includes ~22 MiB of file-backed executable pages no GC can free. At 6.4 h: RSS 78.5 MiB (56.3 anon + 22.2 file), Valetudo 32.5% of one core. A Valetudo restart dropped it to 3.9%.
- Fix `d2b81c8b` (`ForcedGcPolicy`: trigger on heapUsed + external over the heap limit, back off to 60 s while ineffective) deployed through the binary gate: artifact `d813e0ff388fbb70d65469577cd62a4a1e88830983bde6bbb3d6b308110a8a1a`, package `/Users/mattjoslin/Documents/ValetudoBackups/valetudo_d2b81c8b_20260913` (sealed, with `DEPLOY_RECORD.txt`), rollback `/data/valetudo.predeploy_d2b81c8b` (restores `b589bd6d`). Two minutes after deploy: 2.8% CPU, RSS 65.6 MiB, MQTT ready, camera idle.
- Home Assistant was not re-verified with a token; its video switch now pauses and resumes the camera.

## Verified Integration State (f1e5a157 era)

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
- PR #9 is merged but was never deployed on its own; its source is part of the 2026-09-13 deployment. The cleaning-latency gate remains failed. The native companion `feature/alarm-sentry` fixes through `6ab9a50` are published and are the base of `feature/runtime-switches`.
- Native MQTT/Home Assistant discovery for plugin TTS/video controls, mop-dock actions, and robot quirks is part of the deployed build.

## Security Review Stopping Point

- Codex Security Deep Scan 0.1.18 preflight passed on 2026-08-08 for source commit `706d43ff0c41c34523488dac1e60abac3a11b83d`; the Python helper now resolves through `/opt/homebrew/bin/python3` via Codex `shell_environment_policy.set`.
- The logical scan ended in a terminal discovery failure after the account usage limit was exhausted. One Deep Scan command expanded into 17 discovery sessions: 10 were accepted and seven were canceled before the coordinator stopped after three consecutive usage-limit failures.
- No successful terminal discovery handoff, centralized validation, attack-path analysis, canonical draft, completion, or generated `report.md` exists. Partial candidate ledgers are unvalidated discovery evidence and must not be reported as findings or no-findings.
- The original scan cannot be finalized as a canonical Deep Scan: its temporary scan directory was cleaned up and its coordinator state is lost.
- Salvage recovery on 2026-08-13 found that one repository-wide discovery pass had completed its full 955-file (~99,518-line) ledger and retained 10 plausible, unvalidated candidates: secret-bearing log exposure, runtime environment disclosure, four voice-pack SSRF variants, VacuumStreamer TTS shell injection, MCP plaintext Basic Auth, MCP response-body resource exhaustion, and an updater trust/checksum weakness. They are leads, not confirmed vulnerabilities, and have no calibrated severity.
- A focused salvage-validation pass against `706d43ff` started on 2026-08-13 and paused the same day before writing any salvage artifact, validation receipt, or report. No salvage files exist on disk; the candidates survive only in the Codex thread history listed under Agent Session History. Nothing is running. The thread estimated 15,000–30,000 tokens to finish.
- The recorded plan is to resume that salvage validation and produce a clearly labeled non-canonical salvage report. A new Standard or Deep Scan is needed only for a canonical result.

## Agent Session History

Checked 2026-09-13. Work has happened in Codex threads in VS Code and, since 2026-09-13, in Claude Code. Codex transcripts are under `~/.codex/sessions/YYYY/MM/DD/` with thread names in `~/.codex/session_index.jsonl`; Claude Code transcripts are under `~/.claude/projects/-Users-mattjoslin-Documents-GitHub-Valetudo/`.

| Role | Tool | Session | ID | Active (UTC) |
|---|---|---|---|---|
| Latest working session | Claude Code | Status review, docs, upstream-sync test branch, runtime switches build, deployment and profiling | `a53fcc89-ed26-475f-b8f4-efa3d70a7db1` | 2026-08-15 → 2026-09-13 |
| Latest Codex thread | Codex | `Verify corrected GUI profiling - Valetudo REV 2` | `019fe4b0-785e-73b2-bfc3-c14a513e9cf4` | 2026-08-09 04:03 → 2026-09-11 01:06 |
| Parent of the above | Codex | `Verify corrected GUI profiling - Valetudo` | `019f9be7-acc3-7c60-bbfb-932f7e7537a0` | 2026-07-26 00:51 → 2026-08-09 03:45 |

- The latest Codex thread transcript is `~/.codex/sessions/2026/08/09/rollout-2026-08-09T00-03-18-019fe4b0-785e-73b2-bfc3-c14a513e9cf4.jsonl`. With its parent's history, it carries the five-minute profiling runs, the cleaning acceptance captures, the PR #9 merge approval, the Python-helper fix, the Deep Scan, and the paused salvage validation.
- Codex thread `01a098f5-c020-7210-82bf-205892028b24` was opened in this workspace at 2026-09-13 04:10 UTC but contains no messages.

## Open Work

1. Offer the forced-GC fix (`d2b81c8b`, `ForcedGcPolicy`) upstream. Confirmed on 2026-09-14 at 15.8 h uptime: RSS 83.3 MiB (past the old 74 MiB trigger), 2.5% of one core over 60 s, 0 GC bursts, lifetime average 2.0% (was 32.5% at 6.4 h).
2. Security: turn on `CAMERA_LOGIN`. Blocked on where the generated password is stored (writing it to the macOS keychain was not permitted in the session). Home Assistant references, found through the API with `HA_TOKEN`: the Generic camera entry `camera.192_168_1_31_2` (set its username and password fields; Generic inserts them into the RTSP URL); `dashboard-cleaning` advanced-camera-card with `go2rtc.url: http://192.168.1.31:1984` (a browser cannot send go2rtc credentials, so switch it to play through Home Assistant); stale `camera.192_168_1_31` references in `dashboard-cleaning` and `dashboard-yard`.
3. Security: port 6971 bridge, stage 2. Stage 1 is live (2026-09-14): `HTTP_BRIDGE_ALLOW=192.168.1.106` on the robot, other clients get 403, and the plugin TTS commands run without a shell. Next: move Home Assistant's bridge calls to native Valetudo/MQTT entities (driving and obstacle photos have no equivalent yet) and set `HTTP_BRIDGE=off`. Audible TTS playback on `0a1c32f6` is covered by tests but not yet heard.
4. Security: resume the paused salvage validation of the 10 scan candidates in the Codex thread, or run a new scan.
5. Re-verify Home Assistant with a token: video switch pause and resume, URL sensors, camera stream, TTS and dock actions.
6. Capture new docked baselines at matched uptime, plus user-started cleaning profiles, so CPU gates compare like for like.
7. Step 3: a camera page in the Valetudo UI using go2rtc's player (lower priority).
8. Step 4: the duststreamer experiment. It needs a separate go-ahead and someone able to power-cycle the robot, because its driver can hard-lock the kernel.
9. Open pull requests: plugin `feature/runtime-switches` into `main`, then parent `feature/vacuumstreamer-switches` into `master` with the submodule pointer on the plugin merge commit. Decide the base for native `feature/runtime-switches`, which sits on unmerged `feature/alarm-sentry`.
10. Upstream sync: test `test/upstream-sync-2026-09` on the robot, reconcile it with the runtime-switches work, then open a pull request.
11. Restore the missing L10S `VACUUM_THEN_MOP` preset (open PR #1; merged PR #2's change was lost from `master`).
12. Fix the pre-existing ESLint errors in 8 plugin files and consider linting the plugin in CI.
13. After acceptance, prune older on-device rollback binaries (keep `predeploy_0a1c32f6` and `predeploy_d2b81c8b`; the rest are ~480 MB that every robot backup archives) and old backup packages. The Mac had under 1 GB free on 2026-09-13, which made a robot backup fail.
14. The robot's `valetudo_watchdog.sh` sets `VALETUDO_SLOW_REQUEST_MS=500` permanently, unlike the repository copy; decide which is intended.
15. `util/generate_build_metadata.js` records the commit only for `master` or detached checkouts; other builds report `unknown`.
16. The cleaning-latency gate (`root_isolated_ms` p95 ≤ 500 ms) still fails from 2026-07-26.
17. Home Assistant automation `Vacuum Nightly Front Room Vacuum 11:30` has all four triggers disabled; it was left unchanged.

## Documentation Map

- `CLAUDE.md` — primary integration and operations guide
- `.github/copilot-instructions.md` — concise coding-agent guardrails
- `mcp-server/README.md` — MCP setup, environment variables, tunnel, and tools
- `vacuumstreamer-plugin/README.md` — plugin MQTT/Home Assistant entities
- `/Users/mattjoslin/Documents/GitHub/vacuumstreamer/README.md` — native VacuumStreamer documentation, runtime switches, camera modes and login
- `/Users/mattjoslin/Documents/ValetudoBackups/valetudo_b589bd6d_20260913/DEPLOY_RECORD.txt` — 2026-09-13 deployment stages, fixes and profile paths

## Next-Session Checklist

1. Check status in all three repositories and inspect the plugin submodule separately.
2. Fetch before claiming branches are current; do not infer remote state from local tracking refs.
3. Run tests appropriate to every changed component.
4. Commit plugin changes before the parent submodule pointer.
5. Do not deploy without a new checked backup and automatic rollback.
6. Treat the 2026-08-08 Deep Scan as failed and non-final and the 2026-08-13 salvage validation as paused; never summarize the 10 unvalidated candidates as findings or as a clean result.
7. Before continuing earlier work, check both Codex and Claude Code transcripts for a session newer than the ones recorded under Agent Session History.
8. Work from the Open Work list above, and keep it current.
9. Compare CPU and latency only against baselines captured at a similar uptime.
