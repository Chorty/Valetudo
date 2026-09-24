# Valetudo Fork — VacuumStreamer Integration

This fork adds camera streaming, text-to-speech, and safe multi-floor map management for a Dreame L10S Pro Ultra Heat. `MEMORY.md` is the compact project-state index; this file documents the architecture and operating practices.

## Repositories

- **Valetudo parent:** `Chorty/Valetudo`, branch `master`
- **Plugin submodule:** `Chorty/valetudo-vacuumstreamer-plugin`, branch `main`, mounted at `vacuumstreamer-plugin/`
- **Native companion:** `Chorty/vacuumstreamer`; contains the LD_PRELOAD capture shim, go2rtc support, HTTP bridge, and Home Assistant helpers
- **Upstream Valetudo:** `Hypfer/Valetudo`; merge into the fork only after reviewing and testing the integration points
- **Merged 2026-09-16:** the deployed runtime-switches work is on every default branch: native PRs #1 and #2, plugin PR #5, parent PR #10. The deployed upstream sync (`a959c53f`) merged as PR #11. `MEMORY.md` lists commits and open work.

## Robot and Access

- Dreame L10S Pro Ultra Heat, model `r9302`, firmware 1574, aarch64
- Private-LAN address: `192.168.1.31`
- SSH: `ssh vacuum` (configured in `~/.ssh/config` with `~/.ssh/vacuum_rsa`)
- Valetudo watchdog: `/data/valetudo_watchdog.sh`, started by `/data/_root_postboot.sh`
- `blockExternalAccess=true` still permits private-LAN and localhost clients

Never commit SSH keys, passwords, Home Assistant tokens, or MCP credentials. Credentials belong in the system keychain/password manager or the invoking process environment.

## Current Deployed Baseline

Since 2026-09-23 the robot runs Valetudo `fcdd2a85` (release 2026.08.0), built with `tools/build_valetudo.sh` from a clean detached clone. It is fork `master` `fcdd2a85` (the `a959c53f` upstream sync plus documentation and the plugin bump), plugin `6665f1d` (adds `MicrophoneGainCapability` and `RecorderQualityCapability`), binary SHA-256 `26365b9e0e6a44b771ba52a3626f393f64d36cbfa7f6150fe805afeb1c2cb4a7`. The native runtime is `ca57f153` (`cd71f8b` plus `mic_gain_ctl.sh`, `recorder_quality_ctl.sh` and the `vs_strip_leading_zeros` helper; every other runtime file is unchanged), deploy `micquality0923`. `ca57f153` is the tip of native PR #7's branch, which adds the two scripts to `tools/lib.sh` `NATIVE_SCRIPTS`; PR #7 merged as `8fbc54a6`, whose tree equals `ca57f153`, so native `master` matches the robot. Backup and record: `/Users/mattjoslin/Documents/ValetudoBackups/valetudo_fcdd2a85_20260923` (`DEPLOY_RECORD.txt` has the verification and findings); rollback: `/data/valetudo.predeploy_micquality0923` for the binary (`dbe799c1...`), the matching `.predeploy_micquality0923` files on the robot for the native scripts and boot script. The previous baseline `a959c53f` (fork `master` `31480f89` with upstream `190816db`, plugin `eaf1551`, native `cd71f8b`, deploy `sync0916`/`nicefix2_0916`, backup `valetudo_a959c53f_20260916`) is listed in `MEMORY.md`. Deploys between 2026-09-13 and this one are listed in `MEMORY.md`.

After any binary-only Valetudo restart while the robot is docked, the map stays empty until the robot boots or its map changes. The Dreame firmware re-uploads its I-frame only on those events, so a reboot, not a rollback, is the fix.

### 2026-09-13 runtime-switches deployment

- Valetudo: `feature/vacuumstreamer-switches` at `b589bd6d2a3c8d006dd6859aa910677e199e6e47`, plugin `20545a8c27f9422612bb514b3780f65a31d6e074`; the runtime reports that commit
- Active ARM64 binary SHA-256: `94b6beb6a8b26d288faaa2345e53b43523bd478c8307d07b16f6b9061bdca1ff`, built from a clean detached clone with the `manual_build.yml` steps
- Native VacuumStreamer: `feature/runtime-switches` at `6b60354dafcba5dd6e23b6ad3e07ea0a054b382c`; every runtime script, `vacuumstreamer.conf`, `go2rtc.yaml` and `/data/_root_postboot.sh` on the robot matches that commit
- Backup package: `/Users/mattjoslin/Documents/ValetudoBackups/valetudo_b589bd6d_20260913`, sealed with `SHA256SUMS.txt`. It holds the `/data`, `/mnt/private` and `/mnt/misc` archive verified file by file, raw images of every partition except `UDISK`, the U-Boot environment, the factory identity in the decrypted private partition, SSH keys, and the artifact. `DEPLOY_RECORD.txt` records the stages, fixes and profiles. The package contains device secrets and SSH keys; keep it private
- On-device rollback files: `/data/valetudo.predeploy_b589bd6d` (the `f1e5a157` binary `6d9f1ed543a37c261a8ffd2da675c2a47c3e073775c9852b0a5d4b82ac7d74a5`), `/data/_root_postboot.sh.predeploy_b589bd6d` and `/data/vacuumstreamer/go2rtc.yaml.predeploy_b589bd6d`. To roll back, copy them over the originals and reboot
- Older rollback binaries remain in `/data`, including `predeploy_f1e5a157` and `predeploy_6a8829ea`

The deployment passed an on-robot 60-second health gate, a reboot gate of 12 consecutive checks with automatic rollback armed, and runtime commit verification. On the robot the camera stops capturing after 180 s without a viewer, wakes to H.264 stream info in about 3.6 s, pauses and resumes through the Valetudo API, recovers from a `video_monitor` crash in under 1.2 s, and recovers from a frozen `video_monitor` in about 27 s by escalating to KILL. Home Assistant was re-verified with a token on 2026-09-15; see MQTT and Home Assistant.

### Previous baseline

`f1e5a157` (PR #8, merge commit `f1e5a1575df4e472aa98ade4ade4cde7d5b50fb0`), binary `6d9f1ed543a37c261a8ffd2da675c2a47c3e073775c9852b0a5d4b82ac7d74a5` from exact-merge Actions run `30062082320`, backup `/Users/mattjoslin/Documents/ValetudoBackups/valetudo_f1e5a157_20260723_224321` (archive `0ae1689204a0d9b4e95203fdc127d23952f984fe58b167461d1401895aaf37f8`). It passed the candidate checksum and rollback gate, twelve root/API health checks, runtime commit verification, compressed static-asset headers, MQTT, MCP read-only checks, map management, the state SSE stream, joystick zero-motion and disable fail-safes, AVA priority, authenticated Home Assistant checks, video stop/start/HLS, and a user-started cleaning. PR #9 (`eafdf8e8259c9824dc8c94e5b060a998e9b217a7`) merged documentation and source but was never deployed on its own.

## Safe Build and Deployment

Build deployment artifacts from a clean clone checked out detached at the exact commit. `util/generate_build_metadata.js` records the commit only from a detached or `master` checkout, so worktree and feature-branch builds report `unknown`. The plugin commit must be reachable, for example by pointing the submodule URL at the local plugin repository.

```bash
git clone --no-checkout /Users/mattjoslin/Documents/GitHub/Valetudo build-clone
cd build-clone
git checkout --detach <commit>
git submodule update --init
npm ci
npm run build_openapi_schema
npm run lint_all
npm run ts-check_all
npm test --workspace=backend
npm run build --workspace=frontend
npm run build_aarch64 --workspace=backend
```

`build_openapi_schema` is required: without `backend/lib/res/valetudo.openapi.schema.json`, Valetudo logs a warning and turns off API payload validation. Confirm that `backend/lib/res/build_metadata.json` names the commit and that pkg printed no warnings. A fresh checkout also needs `npm run generate_midea_protobufs --workspace=backend` before lint or type checks; the ARM64 build runs it itself. CI uploads the uncompressed aarch64 binary, not the `.upx` copy.

Before deployment:

1. Record the source commit and built artifact SHA-256.
2. Create and integrity-check a timestamped local backup of `/data`, `/mnt/private`, and `/mnt/misc`, verifying every file against an on-robot SHA-256 manifest.
3. Back up what a full reload would need: raw images of the named partitions except `UDISK`, the decrypted `/dev/mapper/private` view (the mounted `/mnt/private` is VacuumStreamer's bind-mounted copy), the U-Boot environment, the Mac SSH key and config, and the robot's dropbear host keys and `authorized_keys`.
4. Preserve the active binary on the robot, and the boot script and `go2rtc.yaml` when they change.
5. Upload the new binary under a candidate filename and verify its remote checksum.
6. Activate it through the on-robot 60-second HTTP health gate with automatic rollback.
7. When the boot path changes, reboot and gate again with rollback of the binary, boot script and `go2rtc.yaml`.
8. Verify root and API HTTP 200 responses, MQTT/Home Assistant availability, watchdog stability, map management, joystick stop behavior, and camera wake, pause and resume.

Do not replace `/data/valetudo` directly without a fresh backup, candidate checksum verification, and rollback path.

### Robot shell notes

- BusyBox 1.36 `flock` has no `-w`; poll `flock -n` instead. `killall` accepts `-SIGNAL` and fails when nothing matches. `jq`, `nc` and `socat` are absent.
- The robot boots with its clock at 1970 and syncs later, so time runtime state from `/proc/uptime`.
- A remote command that searches `ps` output must not contain the literal name it searches for, or it matches and can kill its own shell. Use a bracket pattern such as `[c]amera_supervisor[.]sh`.
- `/proc/net/tcp` lists IPv4 sockets and `/proc/net/tcp6` IPv6 sockets; go2rtc listens on IPv6 and `video_monitor` on IPv4.
- Valetudo state attributes place `"metaData":{}` between `__class` and `value`; parse the JSON instead of matching text.
- Test stubs for robot commands must reject options BusyBox lacks.

## GUI Resource Profiling

Run the dependency-free profiler on this Mac; it only reads fixed process counters over SSH and sends bounded HTTP requests to Valetudo:

```bash
npm run profile_vacuum_resources -- --label docked-video-off --duration 600
```

Defaults are SSH host `vacuum`, HTTP base `http://192.168.1.31`, a five-second interval, a ten-minute duration, and output below `~/Documents/ValetudoProfiles`. Override them with `--ssh-host`, `--http-base`, `--interval`, `--duration`, `--timeout`, and `--output`. The SSH value must be a host alias or IP address, not an option. The HTTP value must be a credential-free origin with no path, query, or fragment. Duration is limited to 5–86400 seconds, interval to 1–3600 seconds, timeout to 100–120000 milliseconds, and a run to 10000 samples.

Each run receives a unique private mode-`0700` directory containing exclusively created mode-`0600` `samples.csv`, `summary.json`, and `metadata.json`. The summary reports HTTP failures and latency percentiles, process CPU/RSS peaks, load, and minimum available memory. SSH output and HTTP bodies are size-bounded, every operation has an absolute deadline, and the measured JavaScript bundle must be an exact same-origin hashed main asset. The profiler never reads process arguments, environment variables, authorization headers, request queries, bodies, or robot logs.

### The two root-latency metrics

Each sample measures the root document twice, and the two numbers answer different questions. Do not compare them to each other or to a single threshold.

- **`root_isolated_ms` — GUI responsiveness.** Issued alone, before anything else in the sample, so nothing of the profiler's own competes with it. This is the number a user experiences, and the one the acceptance targets were always meant to express.
- **`root_ms` — latency under the profiler's concurrent burst.** Issued inside the same `Promise.all` as the SSH `/proc` scan, the state and video requests, and, on extended samples, the map and JavaScript bundle. It measures the robot serving three to five of our own simultaneous requests.

`samples.csv` also records `extended`, `map_ms`, and `javascript_ms` so the burst shape is visible in the recorded data rather than inferable from row position.

### Acceptance criteria

Capture ten minutes each while docked with video off/on and during two user-started normal cleanings with video off/on. Never start cleaning or send movement commands for a benchmark. Compare like-for-like scenarios and roll back a candidate if HTTP fails, available memory falls below 150 MB, AVA or the watchdog reports errors, or CPU/RSS regresses by more than 20%.

Latency gates apply per metric:

- `root_isolated_ms` p95 must be at or below **150 ms docked** and **500 ms cleaning**. This is an absolute gate.
- `root_ms` has **no absolute target**. Gate it on regression only — more than 20% against the recorded baseline for the same scenario — because its value is dominated by how much load the profiler itself applies.

### Historical results, recorded before the metric was split

Every latency figure in this subsection is `root_ms` under the profiler's own burst. Read them alongside the explanation that follows.

The first post-deployment docked/video-on acceptance run that captured every required process is stored at `/Users/mattjoslin/Documents/ValetudoProfiles/2026-07-24T03-34-33-541Z_after-f1e5a157-docked-video-on-maploader-fix_AcWD9N`. It contains 120 samples with zero HTTP failures. Root p50/p95/max were 158.3/232.6/272.9 ms, state p95 was 209.6 ms, minimum available memory was 484036 KB, and peak one-minute load was 6.73.

Three shortened profiles completed on 2026-07-24:

- Docked/video off: `/Users/mattjoslin/Documents/ValetudoProfiles/2026-07-25T00-39-52-906Z_after-f1e5a157-docked-video-off-5min_wDWLQI`; 60 docked/idle samples, zero HTTP failures, root p50/p95/max 181.7/356.7/620.0 ms, and 444784 KB minimum available memory.
- Cleaning/video off: `/Users/mattjoslin/Documents/ValetudoProfiles/2026-07-25T00-27-17-801Z_after-f1e5a157-cleaning-video-off-5min_ru60LH`; 60 cleaning/segment samples, zero HTTP failures, root p50/p95/max 364.8/890.0/1208.9 ms, and 482408 KB minimum available memory.
- Cleaning/video on: `/Users/mattjoslin/Documents/ValetudoProfiles/2026-07-25T00-33-14-644Z_after-f1e5a157-cleaning-video-on-5min_eKYuWp`; zero HTTP failures, root p50/p95/max 548.4/1205.9/1531.9 ms, and 433824 KB minimum available memory. The first 52 samples were cleaning/segment and the final eight were the normal return-to-dock transition, so this is not a pure five-minute cleaning workload.

Across the matched 52-sample cleaning subsets, video-on coincided with about 9.6 aggregate CPU percentage points for `video_monitor`, 1.1 points for go2rtc, and about 30 MB of combined process RSS. Root p95 increased from 1069.7 ms with video off to 1369.6 ms with video on, about 28%. AVA and Valetudo CPU/RSS remained within 10%, every request succeeded, AVA stayed at nice 0, and Valetudo/video processes stayed at nice 10. These were sequential runs and do not establish that video caused the latency or load difference.

### Why the pre-2026-07-25 latency figures missed their targets

Every root latency above was recorded before the profiler measured an isolated probe, so all of them are `root_ms` — latency under the profiler's own concurrent burst. They do not indicate a GUI regression. Measured on 2026-07-25, docked with video on, using single `curl` requests spaced five seconds apart:

| Condition | root latency |
|---|---|
| root alone | 32–80 ms (p50 ≈48) |
| root + SSH `/proc` scan | 63–173 ms (p50 ≈87) |
| root + 2 concurrent API requests | 124–205 ms (p50 ≈166) |
| root + full extended burst (state, video, map, JS bundle, SSH) | 183–589 ms (p50 ≈240) |

The third row reproduces the recorded non-extended p50 of 155.9 ms and the fourth reproduces the recorded p95 of 232.6 ms, so the profiler's own concurrency accounts for the entire gap. Supporting evidence agrees: browser-like persistent connections gave a 30.4 ms root p95, on-vacuum localhost requests took 10–20 ms, and LAN ICMP averaged 24.9 ms. No 500 ms slow-request warnings appeared in the inspected Valetudo log, though those warnings are rate-limited, so their absence supports rather than proves the conclusion.

The three shortened runs therefore remain valid operational evidence — zero HTTP failures, healthy memory and CPU — whose latency figures are explained rather than anomalous. They are accepted with that explanation rather than re-measured, because re-running the cleaning scenarios would require starting two cleanings. The earlier two-sample smoke capture is still not a valid regression baseline.

### Corrected-metric acceptance runs (2026-07-25)

Docked/video on — `/Users/mattjoslin/Documents/ValetudoProfiles/2026-07-25T03-35-49-686Z_corrected-docked-video-on_lObcm0`. All 120 samples were docked with video active and there were zero HTTP failures on every endpoint.

- `root_isolated_ms` p50/p95/max 32.6/**81.9**/164.7 ms — passes the 150 ms docked gate
- `root_ms` p50/p95/max 116.1/166.5/244.7 ms; state p95 189.6 ms; video p95 179.7 ms
- Minimum available memory 554300 KB; peak one-minute load 8.85
- AVA averaged 41.4% CPU at 276508 KB peak RSS, Valetudo 4.4% at 72300 KB, `video_monitor` 3.6% at 8232 KB, maploader 0.028% at 4524 KB

Docked/video off — `/Users/mattjoslin/Documents/ValetudoProfiles/2026-07-25T03-49-39-677Z_corrected-docked-video-off_iLEV6V`. All 120 samples were docked with video inactive and there were zero HTTP failures on every endpoint.

- `root_isolated_ms` p50/p95/max 31.2/**88.8**/126.0 ms — passes the 150 ms docked gate
- `root_ms` p50/p95/max 70.7/158.8/270.5 ms; state p95 196.0 ms
- Minimum available memory 572748 KB; peak one-minute load 8.18
- AVA averaged 40.5% CPU at 276512 KB peak RSS, Valetudo 4.4% at 74840 KB, maploader 0.026% at 4524 KB

Both docked scenarios pass. Comparing them like for like, video-on costs about 3.6 CPU percentage points for `video_monitor`, roughly 18 MB of available memory, and 8% peak load. Isolated latency differs by under 8% in both directions and burst latency by under 5%, so the latency difference between video states is within noise and inside the 20% regression gate. This run was captured while the LAN was being reconfigured; it shows no contamination — zero HTTP failures, an isolated maximum of 126.0 ms, and no sample above 300 ms.

### Corrected-metric cleaning runs (2026-07-26)

The user accepted five-minute rather than ten-minute cleaning windows. Both runs contain 60 pure `cleaning`/`segment` samples at five-second intervals; neither includes a return-to-dock tail. This is useful operational evidence with an explicit shortened-duration caveat, not a waiver of the latency thresholds.

Cleaning/video on — `/Users/mattjoslin/Documents/ValetudoProfiles/2026-07-26T03-59-03-898Z_corrected-cleaning-video-on-5min_iNx4cH`. All 60 samples had video active and every measured endpoint had zero failures.

- `root_isolated_ms` p50/p95/max 146.0/**617.5**/806.1 ms; 9 of 60 samples exceeded 500 ms — fails the 500 ms cleaning gate
- `root_ms` p50/p95/max 362.7/1412.3/1896.2 ms
- Minimum available memory 420412 KB; peak one-minute load 20.15
- AVA averaged 249.6% CPU at 360436 KB peak RSS, Valetudo 45.3% at 91376 KB, and `video_monitor` 7.4% at 9172 KB

Cleaning/video off — `/Users/mattjoslin/Documents/ValetudoProfiles/2026-07-26T04-08-22-092Z_corrected-cleaning-video-off-5min_1XsvUn`. All 60 samples had video inactive and every measured endpoint had zero failures.

- `root_isolated_ms` p50/p95/max 106.5/**554.0**/1377.7 ms; 5 of 60 samples exceeded 500 ms — fails the 500 ms cleaning gate
- `root_ms` p50/p95/max 309.0/1193.1/1348.7 ms
- Minimum available memory 441160 KB; peak one-minute load 17.24
- AVA averaged 256.7% CPU at 360356 KB peak RSS and Valetudo 45.8% at 93784 KB

Video-on versus video-off increased isolated p95 by about 11.5%, burst p95 by 18.4%, peak load by 16.9%, and used about 20 MB more available memory. The video processes consumed about 7.4 aggregate CPU percentage points and 26 MB combined RSS. Video is therefore a measurable but secondary cost, not the primary cause of the cleaning latency.

For a pure-cleaning regression comparison, the first 52 samples of the new runs were matched against the first 52 historical cleaning samples. Burst p95 increased 7.0% with video on (1369.6 to 1465.6 ms) and 12.7% with video off (1069.7 to 1205.0 ms), both inside the 20% regression gate. AVA and Valetudo CPU/RSS remained within 15%. Maploader/video-on and `dmr_player` RSS exceeded 20% proportionally, but only by about 1.7 MB and 2 MB respectively; there was no runtime deployment change between captures. Valetudo and AVA PIDs and the watchdog remained stable, available memory stayed far above 150 MB, and video was restored on after the second run.

The operational checks and burst-regression gates pass, but both cleaning scenarios fail the absolute isolated-latency gate. Four-scenario acceptance is therefore complete in coverage but does not pass cleaning latency.

Uptime caveat: the robot rebooted at about 03:10 UTC on 2026-07-25. The cause is stock Dreame firmware maintenance, not Valetudo, the LAN work, or a fault: `/etc/crontabs/root` runs `/usr/bin/check_restart_ava.sh` at 03:00 UTC daily, which sleeps a random 0–7200 seconds, proceeds only if the robot reports idle, then issues `sys_reboot` and reports cloud code 203 ("early-morning reboot offline"). All three boots recorded in `/data/log/fds.log` fall inside that window — Jul 22 04:45, Jul 23 03:14, and Jul 25 03:11 UTC — and the robot was docked and idle each time. Creating `/data/initialize.sh` disables it, which has not been done. Two marker files the script touches were absent afterwards and no `record_common.log` was produced, so the timing fit is strong but not a closed loop. `/sys/fs/pstore` was empty, no kernel panic or OOM was recorded, and AVA, the watchdog, and `sys_monitor` all came back normally. Both corrected-metric docked runs were therefore captured 24 and 38 minutes after boot, whereas the historical runs had roughly two days of uptime. Absolute latency and memory figures are consequently measured on a fresher system and are not a like-for-like comparison against the historical numbers — available memory was 553–573 MB after the reboot versus 423 MB before it. The isolated-versus-burst separation is unaffected by this, because it is an intra-sample comparison: within the very same samples, isolated p50 was 32.6 ms against a burst p50 of 116.1 ms.

Linux truncates `/proc/<pid>/comm` to 15 characters, so this robot reports the maploader as `maploader-binar`. The profiler accepts both that deployed name and `maploader`; the corrected run measured maploader at 0.026% average CPU and 4400 KB peak RSS.

Set `VALETUDO_SLOW_REQUEST_MS=500` only during an acceptance deployment to log privacy-safe warnings for HTTP responses taking at least 500 ms. The variable defaults to `0` (disabled) and accepts `0` or an integer from 100 through 60000. Telemetry excludes SSE and log-content routes and never logs queries, bodies, headers, client addresses, or credentials.

### Runtime-switches profiles (2026-09-13)

Ten-minute docked profiles of the `b589bd6d` deployment, compared with the 2026-07-25 baselines:

| Scenario | Isolated p95 | Burst `root_ms` p95 | Gates |
|---|---|---|---|
| RTSP viewer watching | 96.2 ms | 193.5 vs 166.5 (+16%) | All pass |
| `CAMERA_MODE=always`, nobody watching | 119.4 ms | 163.4 vs 166.5 (−2%) | All pass |
| `on_demand`, nobody watching, original supervisor | 105.1 ms / 115.9 ms | +90% / +68% | Burst gate fails |
| Same, supervisor frozen | 108.4 ms | 160.4 vs 158.8 (+1%) | Burst gate passes |
| Same, builtin supervisor (`5ff77bc`, deployed) | 111.2 ms | 180.1 vs 158.8 (+13%) | Burst gate passes; Valetudo CPU gate fails, see below |

The original supervisor started about 20 processes every five seconds, which delayed Valetudo's HTTP handling. The builtin rewrite starts only two `pidof` processes per idle check and cut supervisor CPU from 3.03% to 1.35% of one core. Watching costs about 6.5% CPU for `video_monitor` and 2.4% for go2rtc.

Valetudo's own CPU rises with uptime while docked: about 4.5% for the first hour after boot, 6.3% after 3 hours, and 8.5–9.7% after 3.5 hours with the same PID and flat RSS. The `f1e5a157` build did the same, reaching 36–49% after about two days on 2026-07-25. The nightly Dreame reboot resets it. Because the 2026-07-25 baselines were captured 24–38 minutes after boot, compare CPU only at matched uptime. The cause has not been investigated. Profile directories are in `DEPLOY_RECORD.txt`.

### Foyer-scoped cleaning profiles (2026-09-16)

First `root_isolated_ms` pass of the 500 ms cleaning gate since it started failing on 2026-07-26 -- but on a single small room, not the whole-house/multi-room scope of the runs above, so treat this as real evidence, not a replacement for a full acceptance pass. Both runs cleaned segment 5 (Foyer) back to back on the `a959c53f` build (see Current Deployed Baseline).

| Scenario | Isolated p95 | Burst `root_ms` p95 | Gate |
|---|---|---|---|
| Video off | 155.6 ms | 578.8 ms | Passes (500 ms absolute) |
| Video on (automated RTSP viewer) | 318.4 ms | 736.2 ms | Passes (500 ms absolute) |

Zero HTTP failures either run. Valetudo CPU averaged 16.1%/16.4% (off/on) against a 45.8% pre-fix baseline on 2026-07-26 -- the forced-GC fix is holding. The video-off run has a known contamination caveat: the user browsed the Valetudo GUI during it, producing 3 outlier samples (max 2034 ms) that a percentile largely absorbs. The video-on run used an automated `ffmpeg` RTSP puller instead of GUI browsing, so it is not similarly contaminated.

**Root cause found and fixed 2026-09-16, not yet re-verified live.** video-on increased isolated p95 by 104.6% and burst p95 by 27.2% here, far more than the 11.5%/18.4% found in the whole-house 2026-07-26 comparison above, even though AVA and Valetudo CPU were nearly identical between the two Foyer runs (242.5%/241.6% and 16.1%/16.4%). That ruled out ordinary CPU contention as usually measured. The actual cause: scheduling priority. Valetudo deliberately self-lowers to nice 10 (`os.setPriority` in `Valetudo.js`) so it never competes with AVA's real-time control loop; `go2rtc`/`video_monitor` ran at the default nice 0 instead, tied with AVA and ahead of Valetudo. On this 4-core SoC, cleaning alone pushes load past 14-20, and at that point scheduling order -- not CPU percentage -- decides who gets a turn.

Fixed in native `vacuumstreamer` (`master` `cd71f8b`, PRs #4 and #5) and deployed to the robot the same day: `go2rtc`/`video_monitor` now run at nice 10 via `vs_exec_at_nice`, a helper that computes the adjustment needed to reach an absolute target regardless of the calling chain -- the first attempt used a plain relative `nice -n 10`, which worked for go2rtc but not video_monitor (spawned through go2rtc, itself already nice 10, landing at the nice 19 clamp instead of 10 -- caught by checking the live result on the robot). See `MEMORY.md` for the deploy id and rollback.

**Verified live 2026-09-16.** A third Foyer clean with the fix deployed: isolated p95 197.4 ms, down from the pre-fix 318.4 ms (-38.0%), now +26.9% over the video-off baseline (155.6 ms) instead of +104.6% -- close to the July whole-house figure of ~11.5%. One unrelated outlier (a single 4.3 s sample, with state/map/JS bundle also slow in the same batch but `root_ms` normal at 63 ms and no RSS/GC signature around it) points at Node's single-threaded event loop occasionally serializing CPU-bound response building under cleaning's concurrent load, not a priority issue; it doesn't affect p95 and is a separate, lower-priority item for later.

### Perimeter-scoped cleaning comparison (2026-09-18)

The user chose one vacuum-only perimeter run instead of two whole-house cleanings. The robot cleaned segments 1, 2, 3, 4, 6, and 7 once at low fan speed; interior Foyer segment 5 was excluded. The mop attachment remained installed, but operation mode stayed `vacuum`. Two consecutive five-minute windows were captured during the same cleaning: camera idle first, then one authenticated RTSP viewer. Both files contain 60/60 `cleaning`/`segment` samples and zero failures on every measured HTTP endpoint.

| Scenario | Isolated p50/p95/max | Burst `root_ms` p95 | Minimum available memory | Gate |
|---|---|---|---|---|
| Camera idle | 38.6/115.4/269.2 ms | 395.8 ms | 481396 KB | Passes |
| Camera watched | 68.2/221.1/608.3 ms | 824.2 ms | 471428 KB | Passes |

The watched window had one isolated sample above 500 ms, but its p95 was well below the 500 ms cleaning gate. Compared with idle, watched isolated p95 rose 91.6% and burst p95 rose 108.2%. These are sequential portions of one route, so the relative delta mixes camera cost with changing room/navigation load and is not a causal whole-house A/B result. The operational result is strong: the watched p95 is 64.2% below the July 2026 whole-house watched result and 12.0% above the post-fix Foyer watched result, all requests succeeded, minimum memory remained about 460 MiB, and AVA/Valetudo PIDs stayed stable. AVA average CPU rose 12.6%, Valetudo average CPU fell 1.4%, and the watched video processes ran at the intended nice 10.

Profiles:

- `/Users/mattjoslin/Documents/ValetudoProfiles/2026-09-18T04-13-48-393Z_perimeter-cleaning-camera-idle-5min_wG2xVQ`
- `/Users/mattjoslin/Documents/ValetudoProfiles/2026-09-18T04-21-33-780Z_perimeter-cleaning-camera-watched-5min_7aQyNu`

After capture, the viewer was stopped, the cleaning was stopped, the robot returned to its dock at 93% with no error flag, and its original max fan preset was restored. This closes the requested perimeter-scope comparison. It does not claim the stronger causal result that would require separate matched whole-house runs.

## Plugin Capabilities

| Capability | Purpose |
|---|---|
| `VideoStreamCapability` | Starts and pauses the camera through native `camera_ctl.sh` (on-demand capture) and reports stream status and URLs; installs without `camera_ctl.sh` start the binaries directly |
| `TextToSpeechCapability` | Speaks text, plays an approved local audio file, stops playback, and reports status |
| `MapManagementCapability` | Saves, restores, renames, imports, exports, and deletes local floor-map slots |
| `MicrophoneGainCapability` | Reads and sets the microphone gain (0-100) through native `mic_gain_ctl.sh`. Deployed 2026-09-23 |
| `RecorderQualityCapability` | Reads and sets the video encoder profile (`low`/`high`) through native `recorder_quality_ctl.sh`, which rewrites `recorder.cfg` and restarts `video_monitor` under `camera.lock`. Deployed 2026-09-23 |

Plugin backend code lives in `vacuumstreamer-plugin/backend/`. The parent repository supplies narrow registration hooks for capability exports, Dreame implementations, routers, robot registration, and MQTT mappings. Frontend map-management code remains in the parent because Valetudo's TypeScript capability enum and UI routing cannot be extended from the JavaScript submodule.

The removed video-quality selector changed only an in-memory label and restarted the pipeline; it never changed capture resolution, recorder settings, bitrate, or go2rtc output. `RecorderQualityCapability` is a different, real control: it edits camera 0's encoder settings in `recorder.cfg` and applies them by restarting `video_monitor`.

Both new capabilities register under the `CAMERA` switch. Their MQTT handles are `OPTIONAL = false`, like the other plugin handles: the parent's generated `optionalExposedCapabilities` enum cannot be extended from the plugin, so an `OPTIONAL = true` handle could never be enabled. The plugin's execFile helper is `dreame-capabilities/runNativeScript.js`; it removes `LD_PRELOAD` and the go2rtc credentials from the script environment.

## Custom Valetudo API

All paths are below `/api/v2/robot/capabilities`.

### Video stream

- `GET /VideoStreamCapability` — status: `active` when the stream can be watched, plus `capturing`, `paused`, `mode` and process IDs
- `GET /VideoStreamCapability/urls` — RTSP, WebRTC, HLS, and go2rtc URLs
- `PUT /VideoStreamCapability` with `{"action":"start"}` or `{"action":"stop"}`; `stop` pauses the camera until `start` or a reboot, and a refused `start` returns the native script's reason

### Text to speech

- `GET /TextToSpeechCapability` — playback status
- `PUT /TextToSpeechCapability` with `{"action":"speak","text":"Hello","language":"en"}`
- `PUT /TextToSpeechCapability` with `{"action":"play_file","filePath":"/approved/path/audio.wav"}`
- `PUT /TextToSpeechCapability` with `{"action":"stop"}`

### Map management

- `GET /MapManagementCapability` — list floor slots
- `PUT /MapManagementCapability` — `save`, `load`, `delete`, or `rename`
- `GET /MapManagementCapability/export/:id` — export a slot
- `POST /MapManagementCapability/import` — import a slot archive

### Microphone gain and recorder quality (deployed 2026-09-23)

- `GET /MicrophoneGainCapability` returns `{"gain":N}`; `PUT` with `{"action":"set_gain","value":N}` for an integer 0-100. A value outside the range is rejected, not clamped (HTTP 500 from the capability's error path, 400 for a non-number). Set truncates like the bridge handler did, so a get-then-set drifts one step; see `MEMORY.md` for the follow-up
- `GET /RecorderQualityCapability` returns `{"profile","width","height","framerate","bitrate"}`; `PUT` with `{"action":"set_quality","profile":"low"|"high"}` returns the same object after the change. `low` is 864x480/15 fps/600 kbps and `high` is 640x480/25 fps/2 Mbps
- `GET .../properties` on each lists the range or the supported profiles

Map data is stored below `/data/maploader`; active robot map data includes `/data/ri`, `/data/map`, `/data/DivideMap`, and `/data/config/ava/mult_map.json`.

## MQTT and Home Assistant

On 2026-09-17 the HA bridge migration removed 49 of 54 port-6971 references from active configuration. Twenty-five commands and 21 REST sensors now use native Valetudo APIs; the cleaning dashboard uses MQTT statistics, drive speed stays in its HA helper, and TTS scripts use the native notify entity. Manual-control disable first cancels all four HA hold loops. Five bridge references remain for microphone gain, native recorder quality, and OGG playback, so the HA-only bridge remains enabled. Material writes on vendor map ID 221 passed a Foyer tile/restore test. A later supervised joystick test passed: the robot stopped immediately, turned in the expected directions shown by the live video, and streamed smoothly while moving. See [the migration, verification, and rollback record](docs/maintenance/2026-09-17-home-assistant-bridge.md).

With Valetudo MQTT and Home Assistant autodiscovery enabled, the plugin adds:

- a TTS `notify` entity, speaking-state diagnostic sensor, and stop-audio button;
- a video-stream switch and disabled-by-default RTSP/WebRTC URL sensors;
- a `Microphone Gain` number entity and a `Recorder Quality` select entity (both config category; live since 2026-09-23, `number.valetudo_cleanusmaximus_microphone_gain` and `select.valetudo_cleanusmaximus_recorder_quality`), which replace the last two port-6971 controls once Home Assistant is repointed. A change made over REST reaches these entities within about 30 s (Valetudo's periodic refresh).

**Known Home Assistant mic feedback loop (found 2026-09-23, still active until Home Assistant is repointed).** `sensor.vacuum_mic_volume` (a 60 s bridge poll) triggers `Vacuum Volume Sync on Startup`, which copies it into `input_number.vacuum_mic_volume`; that triggers `Vacuum Mic Volume Changed`, which writes it back through the bridge. Reads and writes both truncate, so every pass lowers the mic by one step (raw 19, the value the boot scripts set, drains 61% -> 58 -> 54 -> 51 -> ... -> 0 over about 20 minutes after each boot). Any mic change made by hand is drained the same way. Repointing Home Assistant at `number.valetudo_cleanusmaximus_microphone_gain` removes the loop.

The parent also exposes mop-dock cleaning and drying actions and supported robot quirks as Home Assistant buttons, switches, or selects. Camera media remains on go2rtc/RTSP; MQTT carries discovery, state, and commands rather than video. Since the 2026-09-13 deployment the video switch resumes or pauses the camera, and with on-demand capture it stays on while the camera waits for a viewer. On 2026-09-15, with the camera login on, Home Assistant was re-verified with a token. The Generic camera `camera.192_168_1_31_2` holds the go2rtc credentials and returned a still JPEG and an HLS stream. The video switch paused and resumed the camera, the URL sensors were present, TTS spoke, and mop drying, mop-dock cleaning and auto-empty each ran through HA buttons. The `dashboard-cleaning` camera card plays through Home Assistant (`live_provider: ha`), because a browser cannot send go2rtc credentials.

The authenticated 2026-07-24 live verification found MQTT, MQTT Vacuum Camera, and Valetudo configured without failed setup and attached to the same `Vacuum CleanusMaximus` device. The device exposed 52 entities, including maploader, dock actions, TTS, stop-audio, video, and robot-quirk controls; the RTSP and WebRTC URL sensors were the only disabled entities and are disabled by default. Home Assistant reflected the authorized API video stop/start, both video processes returned, the HLS master playlist returned HTTP 200, and a temporary encoded-stream sample measured approximately 15.02 FPS. HA-originated TTS, dock, maploader, and other state-changing entity commands were not exercised during this verification.

On 2026-07-25 the TTS and map-management capabilities were exercised directly against the Valetudo API, closing the gap left by the earlier verification. TTS `speak` returned HTTP 200 after awaiting the full download/convert/play pipeline, with request durations matching real playback (5.19 s for a one-line phrase) and matching `TTS: Speaking` entries in `/tmp/valetudo.log`. Because the route awaits playback, `speaking` is only observable by a concurrent reader; a concurrent poll during a longer phrase returned `speaking: true` with `currentText` populated, and `stop` cancelled the in-flight job after 10.2 s and returned the capability to `speaking: false`. Map management listed 11 slots, exported a non-active slot as a valid 215723-byte gzip archive containing `mult_map.json` and `DivideMap`, saved a new slot, and renamed it, all while the active slot and the docked/idle robot state were unchanged. `load` and `delete` were deliberately not exercised.

Two minor API-semantics observations: the 200-character TTS limit and an interrupted TTS job both surface as HTTP 500 rather than 400 and 200/409 respectively. Both guards work correctly; only the status codes are questionable, and neither was changed.

On 2026-07-26 the authorized Home Assistant → MQTT → Valetudo command path was exercised from the exact live HA entities:

- `switch.valetudo_cleanusmaximus_video_stream` changed Valetudo and HA feedback off, then on; `video_monitor` and go2rtc returned.
- `notify.valetudo_cleanusmaximus_speak` produced `speaking: true`; `button.valetudo_cleanusmaximus_stop_audio` returned it to false. Cancelling the in-flight MQTT setter produces the already-known MQTT error log for interrupted playback.
- Mop drying transitioned `idle → drying → idle`, mop-dock cleaning transitioned `idle → cleaning → idle`, and auto-empty transitioned `idle → emptying → idle`, all through HA buttons.
- `select.vacuum_cleanusmaximus_vacuum_maploader_map` published `main` to `valetudo/CleanusMaximus/maploader/map/set`. Maploader returned idle, the managed-map list remained at 11 slots, the active slot remained `6_rooms_071826_mrqdwbmr` ("6 rooms 071826"), and `/data/config/ava/mult_map.json` retained SHA-256 `1e2ffac9bdf310cedbaf039be05e572f929b34bfd12a9ef671c2d04149126124`.

The first mop-dock-cleaning attempt coincided with a Valetudo MQTT keepalive timeout. HA's service request timed out, the dock stayed idle, Valetudo reconnected and republished discovery automatically, and HA entities were unavailable for about three seconds. MQTT then remained `ready`; the mop-cleaning and drying retries passed. At final verification the robot was docked/idle at 100%, video was on, TTS was idle, Valetudo/AVA/video PIDs and the watchdog were healthy, MQTT was ready, and no map or slot state had changed.

The two vacuum-light automations and `Valetudo: Notifications` are enabled; the notification automation's latest inspected trace completed successfully. The automation named `Vacuum Nightly Front Room Vacuum 11:30` is enabled, but all four of its triggers are individually disabled, so it cannot start automatically until they are re-enabled. That is a Home Assistant configuration finding, not a Valetudo integration failure, and it was not changed automatically.

## MCP Server

`mcp-server/` is a local stdio Model Context Protocol server. It exposes 49 Valetudo tools without opening a network listener. The normal topology is to run it on this Mac and connect directly to `192.168.1.31`.

Environment variables:

| Variable | Requirement |
|---|---|
| `VALETUDO_HOST` | Required |
| `VALETUDO_PORT` | Optional; defaults to `80` |
| `VALETUDO_USERNAME` and `VALETUDO_PASSWORD` | Optional, but must be supplied together |
| `VALETUDO_TIMEOUT_MS` | Optional; defaults to `10000`, range 100–120000 ms |

Leave username/password unset while Valetudo Basic Auth is disabled. For remote clients, tunnel through a trusted LAN host with `ssh -N -L 8080:192.168.1.31:80 <lan-host>` and point MCP at `127.0.0.1:8080`. See `mcp-server/README.md` for configuration and tool inventory.

## Native VacuumStreamer

Required on the robot:

- `/data/vacuumstreamer/vacuumstreamer.so`, `video_monitor`, `go2rtc`, `go2rtc.yaml` and `ffmpeg`
- `/data/vacuumstreamer/tts_handler.sh`, launched through `tcpsvd` on port 6971
- Runtime scripts from `Chorty/vacuumstreamer` `master`: `vacuumstreamer_lib.sh`, `vacuumstreamer_boot.sh`, `go2rtc_launch.sh`, `video_monitor_launch.sh`, `camera_wake.sh`, `camera_supervisor.sh`, `camera_ctl.sh`, `mic_gain_ctl.sh`, `recorder_quality_ctl.sh` and `http_bridge.sh`. `tools/` in that repository holds the backup, build and gated deploy scripts
- `/data/vacuumstreamer/vacuumstreamer.conf`, installed once and never overwritten by later deployments

### Runtime switches

`vacuumstreamer.conf` holds `CAMERA`, `CAMERA_MODE` (`on_demand` or `always`), `CAMERA_IDLE_SECONDS` (default 180), `CAMERA_LOGIN` (default off), `TTS`, `MAP_MANAGEMENT`, `HTTP_BRIDGE` and `HTTP_BRIDGE_ALLOW` (default `any`). The file is parsed, never executed. The boot script and the plugin both read it, and a switched-off capability is not registered. Reboot after changing a switch; `HTTP_BRIDGE_ALLOW` is read on every bridge request and needs no reboot. Deployed values since 2026-09-15: everything on, `CAMERA_MODE=on_demand`, `CAMERA_LOGIN=on`, `HTTP_BRIDGE_ALLOW=192.168.1.106` (Home Assistant).

### Camera lifecycle

- go2rtc runs while the camera is on. Its video source is `echo:/data/vacuumstreamer/camera_wake.sh`, which starts `video_monitor` when a viewer connects and returns `tcp://127.0.0.1:6969`.
- `camera_supervisor.sh` checks every 5 s. It restarts go2rtc with backoff, stops `video_monitor` after `CAMERA_IDLE_SECONDS` without a viewer, keeps it running with `CAMERA_MODE=always`, and restarts it, escalating to KILL, when a connected stream receives no video for 20 s. An idle check starts only two `pidof` processes.
- `camera_ctl.sh start|stop|status` is what Valetudo calls. `stop` pauses the camera until `start` or a reboot, even while a viewer retries.
- Logs go to `/tmp/vacuumstreamer.log` and runtime state to `/tmp/vacuumstreamer/`.
- Run the script tests with `sh test/run_tests.sh dash` in the native repository.

### Camera login

`CAMERA_LOGIN=on` protects go2rtc's API and RTSP with credentials that go2rtc reads through `CREDENTIALS_DIRECTORY` from `/data/vacuumstreamer/credentials/GO2RTC_USERNAME` and `GO2RTC_PASSWORD`. The directory must be mode 700 and the files 600; values may use letters, digits, `.`, `_`, `~` and `-`, and the password needs at least 16 characters. Misconfigured credentials stop the camera instead of running it without a login. Requests from the robot itself are not challenged. The native README covers setup and client URLs.

### Duststreaming (upstream, unrelated)

Since the 2026-09-17 upstream sync, Valetudo Options shows a "Camera Streaming" toggle ("See what your robot sees"). This is upstream's own **Duststreaming** feature, added in `90dc810c`, and it shares no code with VacuumStreamer's camera:

| | VacuumStreamer's camera | Duststreaming |
|---|---|---|
| Capture | Dreame's own `video_monitor` vendor binary, intercepted via the `vacuumstreamer.so` LD_PRELOAD shim | A separate `duststreamer` binary (gstreamer, not included) reimplements capture from scratch, talking directly to the camera hardware per SoC platform (`dreame_mr813` among others, `LinuxDuststreamingCapability.js`) |
| Where it runs | Separate processes (`video_monitor`, `go2rtc`), isolated from Valetudo, both at Valetudo's own nice level since the fix above | `duststreamer` → UDP → straight into Valetudo's own Node process, which `res.write()`s every frame to every subscriber itself (`DuststreamingCapabilityRouter.js`) -- its video load is inseparable from Valetudo's own event-loop responsiveness |
| Output | go2rtc: RTSP, WebRTC, HLS, API | One raw MPEG-TS HTTP stream |
| Login | Dedicated go2rtc credentials (`CAMERA_LOGIN`) | None of its own -- rides entirely on Valetudo's Basic Auth, which is off on this robot |
| Enabling it | On by default, part of the product | Manual binary install plus a mandatory ethics/privacy warning dialog every time, and a one-way "delete the binary" killswitch |

Its driver can hard-lock the kernel on some platforms (`MEMORY.md` Open Work item 13), which is why the UI gates it behind that warning and manual install, and why this project leaves it off. Do not enable it, and do not confuse a question about "the camera" with this feature -- ask which one is meant if it's unclear.

## Security Review Status

The Codex Security Deep Scan started on 2026-08-08 against source commit `706d43ff0c41c34523488dac1e60abac3a11b83d` after its configuration preflight passed. The Python helper issue was resolved by setting `PYTHON = "/opt/homebrew/bin/python3"` in the Codex `shell_environment_policy.set` configuration.

The scan did **not** complete. Its repeated discovery command dispatched 17 independent discovery sessions; 10 results were accepted and seven sessions were canceled. The coordinator then terminated discovery after three consecutive workers hit the account usage limit. No successful terminal discovery handoff was accepted, and centralized validation, attack-path analysis, canonical draft recording, completion, and generated `report.md` never ran. Partial candidate artifacts are discovery evidence only: do not treat them as validated findings or as evidence that the repository has no findings.

The original logical scan is stopped and cannot be finalized as a canonical Deep Scan: its temporary scan directory was cleaned up and its coordinator state is lost.

Salvage recovery on 2026-08-13 found that one repository-wide discovery pass had completed its full 955-file, roughly 99,518-line coverage ledger and retained ten plausible candidates: secret-bearing log exposure, runtime environment disclosure, four voice-pack SSRF variants, VacuumStreamer TTS shell injection, MCP plaintext Basic Auth, MCP response-body resource exhaustion, and an updater trust/checksum weakness. None has been validated or assigned a severity.

A focused salvage-validation pass against `706d43ff` began the same day. It classifies each candidate by attacker-controlled source, reachable sink, missing control, product boundary, and impact, with bounded tests planned for the TTS command construction and MCP behaviors. It paused before writing any salvage artifact, validation receipt, or report.

On 2026-09-14 through -16 all ten candidates were assessed by hand against current source. That review is recorded in `/Users/mattjoslin/Documents/ValetudoBackups/valetudo_secrets_20260916/DEPLOY_RECORD.txt` and is not a canonical scan result:

- **Fixed and deployed:** the secret-bearing log exposure (`77efd541`; the miIO cloud and local secrets and the handshake token are no longer logged), the runtime environment disclosure (`4656a38e`; secret-shaped keys are redacted from `/runtime/info`), and the VacuumStreamer TTS shell injection (plugin `cd18818`, which runs TTS without a shell)
- **Fixed on the Mac only:** MCP response-body resource exhaustion (`b8e5cdd9`; bodies capped at 10 MiB)
- **Assessed, not changed:** the four voice-pack SSRF variants. The robot does fetch an admin-supplied URL, but on this flat LAN it gives an attacker no reach they lack already.
- **Assessed, not a bug:** MCP plaintext Basic Auth (documented design; tunnel for remote clients) and the updater trust weakness (SHA-256 checked against a manifest from `api.github.com`; code signing is absent)

A new Standard or Deep Scan is still needed for a canonical result.

### Exposures found 2026-09-13

These are confirmed from source and configuration, separate from the scan candidates above. The first two have been mitigated on the robot:

- **Mitigated 2026-09-15 by `CAMERA_LOGIN=on`.** While `CAMERA_LOGIN=off`, go2rtc's API on port 1984 is open to the LAN. `POST /api/config` rewrites go2rtc's configuration, which can add command-running sources, and `/api/restart` applies it, so any device on the network could run commands as root on the robot. The login was verified against a local go2rtc 1.9.9 build: 401 without or with wrong credentials, 200 with them, and no secret in `/api/config` or process arguments.
- **Partly mitigated 2026-09-14 by `HTTP_BRIDGE_ALLOW=192.168.1.106`; other clients get 403.** The port 6971 HTTP bridge (`tts_handler.sh`) has no authentication and can drive the robot, start cleaning and reset consumables. `HTTP_BRIDGE=off` disables it once Home Assistant no longer needs it (MEMORY.md Open Work).
- **Still open:** Valetudo Basic Auth is disabled.

## Agent Session History

Work on this repository has happened in Codex threads in VS Code and, since 2026-09-13, in Claude Code. Before continuing earlier work, find the newest session rather than assuming these docs are current:

- Codex transcripts: `~/.codex/sessions/YYYY/MM/DD/rollout-<timestamp>-<session-id>.jsonl`
- Codex thread names: `~/.codex/session_index.jsonl`
- Claude Code transcripts: `~/.claude/projects/-Users-mattjoslin-Documents-GitHub-Valetudo/`

Find relevant sessions by searching transcripts for this repository path, then order them by file modification time. A resumed Codex thread keeps its original date directory, so the directory date is not its last-activity date, and some threads are opened in this workspace without any messages. As of 2026-09-23 the latest working session is Claude Code session `1705630b-0612-4fa2-a5de-27d7c1f0f02f` (titled `Locate CLAUDE.md and MEMORY.md`, the same title as the Codex thread `01a0b13e-11be-7f41-9650-d172faf2e36c` that preceded it), which reviewed the Codex bridge-migration work, applied the Home Assistant polling cleanup, built and reviewed the mic-gain and recorder-quality replacements, and built the parent for deployment; two short Claude Code follow-ups (`592f661a-8b36-4b80-8305-42123929db32`, untitled, and `fd142e7e-a17c-4146-8a6f-87a6abd4e4a2`, "Merge plugin and native PRs") merged the PRs and checked deployment state. Titles are not unique across tools, so search by ID. `MEMORY.md` carries the handoff note and the deployment sequence.

## Development Rules

- Commit plugin changes first, then update and commit the parent submodule pointer.
- Keep parent integration hooks narrow and avoid copying plugin backend code into Valetudo core.
- Run plugin tests through the parent backend workspace because the plugin intentionally has no standalone package.
- Preserve safe filesystem allowlists and joystick zero-motion/disable fail-safes.
- Treat backup directories, firmware extracts, binaries, `.DS_Store`, keys, and credentials as local artifacts, not source files.
- Review `git status` in the parent, plugin, and native companion independently.
- Test robot shell scripts against BusyBox behavior, and run the native script tests under `dash`.
- Build deployment artifacts from a clean clone checked out detached at the deployed commit.
- A new native runtime script must also be added to `NATIVE_SCRIPTS` in the native repository's `tools/lib.sh`, or `deploy_native.sh` never installs it. `test/run_tests.sh` checks that the scripts the plugin calls are listed.
- Shell scripts run under BusyBox ash, and dash is the test stand-in: do not use `$((10#$x))` (unsupported), `sed -i` (its argument differs between BSD and GNU/BusyBox sed), or plain arithmetic on user-supplied digits (a leading zero reads as octal; use `vs_strip_leading_zeros`).

## Upstream Synchronization

```bash
git fetch origin
git merge origin/master
```

In this checkout, `origin` is Hypfer's upstream and `fork` is Chorty's fork. Re-run lint, type checks, tests, production frontend build, and ARM64 packaging after every upstream integration.

`sync/upstream-2026-09-16` (`a959c53f`, merged as PR #11) merges upstream through `190816db` onto `master` `31480f89` and is deployed. Two conflicts were resolved: `ValetudoAppBar.tsx` keeps both imports, and `Valetudo.js` keeps `ForcedGcPolicy` instead of upstream `40e767de`. Upstream estimates resident code RSS once after startup, but on the L10S executable pages become resident over hours, so that trigger can re-arm every 2.5 s with no backoff. The pre-merge checks and on-robot results are in the deploy record: floor-material `vendorMapId` from `curid` is 221, `provideMapData` was migrated away, and the status flag is `none` while docked. Leave upstream's Duststreaming off: its driver can hard-lock the kernel. The L10S `VACUUM_THEN_MOP` preset is missing from both `master` and upstream. Upstream removed it on purpose in `e42adcb7`, so fork PR #1, which re-added it, was closed until a user-started cleaning shows preset 3 vacuums first and then mops.

## Known Harmless Warnings

- `unknown water grade` during AVA restart
- `misc tunables` noise already present upstream
