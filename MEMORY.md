# Project Memory Index

Last updated: 2026-09-16

## Repositories

| Component | Location | Active branch | Remote |
|---|---|---|---|
| Valetudo parent | `/Users/mattjoslin/Documents/GitHub/Valetudo` | Deployed `sync/upstream-2026-09-16` at `a959c53f` (upstream `190816db` merged onto `master` `31480f89`); `master` matches the previous deployment via PR #10 | `Chorty/Valetudo` via `fork` |
| VacuumStreamer plugin | `vacuumstreamer-plugin/` | Deployed `eaf1551`, on `main` via PR #5 (merge `f54b23b`) | `Chorty/valetudo-vacuumstreamer-plugin` |
| Native companion | `/Users/mattjoslin/Documents/GitHub/vacuumstreamer` | Deployed `1d0b187`, on `master` via PR #1 (`feature/alarm-sentry`) and PR #2 (merge `f68214f`) | `Chorty/vacuumstreamer` |

On 2026-09-16 every deployed branch was merged into its default branch; only the parent's `sync/upstream-2026-09-16` awaits its PR.

The native companion's former untracked backups, extracted device data, and build artifacts were moved intact to `/Users/mattjoslin/Documents/GitHub/vacuumstreamer_local_archive_20260721_222234`. Its 16,330-entry manifest has SHA-256 `2fff74550715713760b9ca9c5bb07ff434e1c86e296e0b44a26d6ea9df0712ec`.

## Deployed Baseline

- Deployed 2026-09-13: Valetudo `b589bd6d2a3c8d006dd6859aa910677e199e6e47` with plugin `20545a8c27f9422612bb514b3780f65a31d6e074`, binary SHA-256 `94b6beb6a8b26d288faaa2345e53b43523bd478c8307d07b16f6b9061bdca1ff`; native VacuumStreamer `6b60354dafcba5dd6e23b6ad3e07ea0a054b382c`
- Backup package: `/Users/mattjoslin/Documents/ValetudoBackups/valetudo_b589bd6d_20260913` (sealed; see `BACKUP_INFO.txt` and `DEPLOY_RECORD.txt`); contains device secrets and SSH keys
- Active since 2026-09-16 15:01 EDT: Valetudo `a959c53f` (upstream sync through `190816db`, release 2026.08.0; plugin `eaf1551`), SHA-256 `dbe799c11a62af733686df1dfc126595507ce5e0c15d2dd3ea3bfc3f72aadfe9`, native unchanged (`1d0b187`); package `/Users/mattjoslin/Documents/ValetudoBackups/valetudo_a959c53f_20260916` (sealed, `DEPLOY_RECORD.txt`); rollback: `/data/valetudo.predeploy_sync0916`. The binary gate passed, then the robot was rebooted so the map would reload (see Recently Completed).
- Previous: Valetudo `4656a38e` (plugin `eaf1551`, ESLint config only), SHA-256 `13a88308ec1f9c101fc2d2d9d5f29c40dcbfea28d3552757caf1a642a05962d4`, native unchanged (`1d0b187`); package `/Users/mattjoslin/Documents/ValetudoBackups/valetudo_secrets_20260916` (sealed, `DEPLOY_RECORD.txt`); rollback: `/data/valetudo.predeploy_secrets0916`. Fixes two of the salvage-scan candidates (see item 4): the miIO secret/token log exposure and the `/runtime/info` env disclosure.
- Previous: `7bddd63a` (MQTT "speaking" immediate-publish fix, plugin `ce3bf73`), SHA-256 `a6e3cfe8b2339a6df1e492a45ae705216641cf48971bebf435cea56b992ac7d4`, native unchanged (`1d0b187`); package `/Users/mattjoslin/Documents/ValetudoBackups/valetudo_speaking_20260915`; rollback: `/data/valetudo.predeploy_speaking0915`
- Previous: `e5f95357` (TTS ffmpeg-path fix, plugin `475608f`), SHA-256 `fc4a4230636afba56702330c31dc4ae7adf95d435f49b5b1e5345fadafc9929b`, native unchanged (`1d0b187`); package `/Users/mattjoslin/Documents/ValetudoBackups/valetudo_ttsfix_20260915`; rollback: `/data/valetudo.predeploy_ttsfix0915`
- Before that: `0a1c32f6` (bridge allow list, plugin TTS-without-a-shell), SHA-256 `88d2e284a83a41293e2c51418f2accd577226ac7d1a338afe82bb9bf55e3e21a`, native `1d0b187`; package `/Users/mattjoslin/Documents/ValetudoBackups/valetudo_0a1c32f6_20260914`; rollback: every `*.predeploy_0a1c32f6` file (binary, `_root_postboot.sh`, `/data/vacuumstreamer/*`), then reboot
- Before that: `d2b81c8b` (forced-GC fix), SHA-256 `d813e0ff388fbb70d65469577cd62a4a1e88830983bde6bbb3d6b308110a8a1a`; its rollback is `/data/valetudo.predeploy_d2b81c8b` (see "2026-09-13 Deployment")
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
| Latest working session | Claude Code | Merged deployed branches (native #1/#2, plugin #5, parent #10), upstream sync, deploy `sync0916` | `5513e463-4970-4e68-b12c-4c858988bb9d` | 2026-09-16 |
| Earlier working session | Claude Code | Runtime switches build, deployment, profiling, fixes through `4656a38e` | `a53fcc89-ed26-475f-b8f4-efa3d70a7db1` | 2026-08-15 → 2026-09-16 |
| Latest Codex thread | Codex | `Verify corrected GUI profiling - Valetudo REV 2` | `019fe4b0-785e-73b2-bfc3-c14a513e9cf4` | 2026-08-09 04:03 → 2026-09-11 01:06 |
| Parent of the above | Codex | `Verify corrected GUI profiling - Valetudo` | `019f9be7-acc3-7c60-bbfb-932f7e7537a0` | 2026-07-26 00:51 → 2026-08-09 03:45 |

- The latest Codex thread transcript is `~/.codex/sessions/2026/08/09/rollout-2026-08-09T00-03-18-019fe4b0-785e-73b2-bfc3-c14a513e9cf4.jsonl`. With its parent's history, it carries the five-minute profiling runs, the cleaning acceptance captures, the PR #9 merge approval, the Python-helper fix, the Deep Scan, and the paused salvage validation.
- Codex thread `01a098f5-c020-7210-82bf-205892028b24` was opened in this workspace at 2026-09-13 04:10 UTC but contains no messages.

## Recently Completed (2026-09-13 through -16)

Full detail lives in each deploy's `DEPLOY_RECORD.txt` and the commit messages; this is
just the closure log so Open Work below stays focused on what's still open.

- Runtime switches, camera on-demand/always modes, optional go2rtc login (`d2b81c8b` era).
- Forced-GC CPU fix (`d2b81c8b`/`ForcedGcPolicy`): confirmed at 15.8 h uptime, 2.5% CPU vs. 32.5% before.
- Port 6971 bridge stage 1 (`0a1c32f6`): `HTTP_BRIDGE_ALLOW=192.168.1.106`, others get 403.
- VacuumStreamer TTS shell injection fixed (`cd18818`/`475608f`).
- Camera login turned on and re-verified end to end through Home Assistant (`0a1c32f6` era); dashboard cards updated to `live_provider: ha`; stale camera-entity references fixed.
- TTS ffmpeg-path fix (`e5f95357`/`475608f`, deploy `ttsfix0915`): conversion was silently failing and playing raw MP3 as `.wav`.
- MQTT "speaking" sensor immediate-publish fix (`7bddd63a`/`ce3bf73`, deploy `speaking0915`): was gated behind a 30 s poll that a 5-8 s phrase almost always missed entirely.
- Plugin ESLint config added and wired into CI (`eaf1551`/`f5308562`): the plugin was never actually being linted at all.
- Build commit id fixed to use `git rev-parse HEAD` (`4702b019`): previously wrong on every branch but master, and on any worktree checkout.
- Security-scan candidates fixed and deployed (`4656a38e`/`77efd541`, deploy `secrets0916`): miIO CloudSecret/LocalSecret/handshake-token log exposure, and unconditional env disclosure on `/runtime/info` (now redacts secret-shaped keys). Also fixed, Mac-side only: MCP client response-body size cap (`b8e5cdd9`).
- Deployed branches merged (2026-09-16): native PRs #1 and #2, plugin PR #5, parent PR #10 (`31480f89`, all CI checks passed).
- Upstream sync deployed (`a959c53f`, deploy `sync0916`): upstream through `190816db`. Kept `ForcedGcPolicy` over upstream `40e767de`, whose startup code-RSS estimate misses executable pages that become resident later. Checked on the robot: `vendorMapId` from `curid` is 221, matching `/data/map/221`; the config migration removed `provideMapData`; the status flag is `none` while docked; Duststreaming is disabled. A Valetudo restart while docked leaves the map empty until the robot boots or the map changes, because the firmware re-uploads only then. This is not a regression; a reboot brought the map back.
- Matched-uptime docked camera baselines captured on `0a1c32f6` (`tools/profiles.sh nightly0915`); all gates pass, use these as the new baseline going forward.

## Open Work, by importance

1. **Restore the missing L10S `VACUUM_THEN_MOP` preset.** A real functional regression, not a process task: this cleaning mode was merged once (PR #2) and then lost from `master`; PR #1 is still open with the fix.
2. **Port 6971 bridge, stage 2.** Stage 1 (IP allowlist) is live and closes most of the exposure. Left: move Home Assistant's remaining bridge calls to native Valetudo/MQTT entities (driving and obstacle photos have no equivalent yet) and set `HTTP_BRIDGE=off`.
3. **Cleaning-latency re-test** (on hold -- the user asked to hold off on starting cleanings). Docked baselines already pass every gate on the current build; the CPU fix plausibly also fixes the `root_isolated_ms` p95 ≤ 500 ms cleaning gate that's been failing since 2026-07-26, but that needs two real user-started cleanings (camera idle, camera watched) to confirm.
4. **Merge `sync/upstream-2026-09-16` into `master`.** It is deployed and verified on the robot; open the PR and merge once CI passes. Not yet exercised on the robot: joystick movement with upstream's disable-calls-stop change, and segment material writes with the new `curid` map ID.
5. **Upstream sync going forward.** `origin` is Hypfer. Merge onto `master`, keep `ForcedGcPolicy` unless upstream adopts an equivalent, and expect no map after a docked binary-only restart until a reboot.
6. **Watchdog `VALETUDO_SLOW_REQUEST_MS` decision.** The robot's `valetudo_watchdog.sh` sets it to `500` permanently; the repo copy defaults to `0` (off), and CLAUDE.md says it's meant only for acceptance-deployment telemetry. Decide whether to turn it off on the robot or make `500` the intended default.
7. **Housekeeping: prune old on-device rollback binaries and old Mac backup packages.** Lower urgency now that the Mac has ~18 GB free again (it was under 1 GB on 2026-09-13, which is what made a backup fail that day). Keep `predeploy_secrets0916` and one or two before it; the rest are ~480 MB+ that every future robot backup re-archives.
8. **Camera page in the Valetudo UI** using go2rtc's player. Explicitly lower priority per the user; useful mainly for debugging.
9. **Voice-pack SSRF (4 vendor variants), assessed 2026-09-16, not fixed.** Real in principle -- the robot fetches an admin-supplied URL -- but this flat `/24` LAN gives an attacker who can already reach the admin API no extra reach through the robot. Fixing all four vendor implementations (Dreame/Roborock/Viomi/mock) without breaking legitimate downloads needs more research than a quick pass.
10. **Home Assistant automation `Vacuum Nightly Front Room Vacuum 11:30`** has all four triggers individually disabled. Looks deliberate; left unchanged both times it's come up.
11. **Offer several fixes upstream.** All unmodified upstream code, none fork-specific, zero urgency for this robot specifically: the forced-GC fix, the build-commit-id fix, and the miIO secret-logging/env-disclosure fixes.
12. **The duststreamer experiment.** Explicitly gated behind a separate go-ahead and someone able to power-cycle the robot, since its driver can hard-lock the kernel. Kept last regardless of interest level, because of that risk and the explicit gate.

## Documentation Map

- `CLAUDE.md` — primary integration and operations guide
- `.github/copilot-instructions.md` — concise coding-agent guardrails
- `mcp-server/README.md` — MCP setup, environment variables, tunnel, and tools
- `vacuumstreamer-plugin/README.md` — plugin MQTT/Home Assistant entities
- `/Users/mattjoslin/Documents/GitHub/vacuumstreamer/README.md` — native VacuumStreamer documentation, runtime switches, camera modes and login
- `/Users/mattjoslin/Documents/ValetudoBackups/valetudo_b589bd6d_20260913/DEPLOY_RECORD.txt` — 2026-09-13 deployment stages, fixes and profile paths
- `/Users/mattjoslin/Documents/ValetudoBackups/valetudo_a959c53f_20260916/DEPLOY_RECORD.txt` — upstream sync: conflict decisions, pre-merge checks, the docked map-reload finding

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
