# Deploy follow-up — 2026-10-31

Continues the `fdiff1029` handoff. The robot still reports Valetudo `eb183cb9798608023e2f9011c413c3dbb21898c4`, release 2026.10.0. No deployment, reboot, cleaning or map modification was performed.

## Chrome verification

The Mac used an SSH tunnel terminating at the robot's loopback HTTP listener. Chrome automation could not complete the Basic Auth prompt directly. A temporary loopback viewer read the existing login from Keychain, forwarded only GET/HEAD over that tunnel, required a private session cookie and rejected cross-site requests. It did not change the robot's authentication or HTTPS proxy allowlist. The viewer and tunnel were stopped after verification.

- Home rendered the full map and reported docked, battery 100%, dock idle.
- Floor Management rendered 10 saved floors with `6 rooms 071826` active. Save/import/switch/rename/delete were not exercised.
- Camera rendered Available / Idle / On demand initially. The first Watch attempt failed after fallback to HLS; the robot logged a 15-second `/live.m3u8` request returning 502. A direct bounded MP4 request then received HTTP 200 and video bytes. Retrying Watch played `live.mp4` at 864×480, readyState 4, with currentTime advancing from 2.441 to 10.9779 seconds and no media error. Stop watching closed this browser's stream; Pause camera was not used.

Playback after retry is verified; reliable cold-start playback is still unproven. The temporary viewer adds another transport layer, so this session does not establish the cause of the first failure.

## Build verification fixes (drafts, not deployed)

- Plugin [#14](https://github.com/Chorty/valetudo-vacuumstreamer-plugin/pull/14), `c887eb1`: use a relative sidecar path plus an explicit static root in `res.sendFile`. This keeps dotfile checks within the served directory. Brotli, gzip and HEAD succeed below a `.cache` ancestor, while hidden files within the root remain inaccessible.
- Native [#20](https://github.com/Chorty/vacuumstreamer/pull/20), `f5762b2`: build the frontend before backend/plugin tests, matching Node.js CI, so a fresh deploy build exercises the real frontend instead of skipping its WebServer test. The build record lists the corrected order.
- The parent update pins the plugin fix and records this handoff. Merge the plugin PR first, then refresh the parent pointer to its main-branch merge commit before merging the parent.

Validation: reproduced the original real-WebServer failure (HTTP 500) in `~/.cache/vacuumstreamer-tools/build-eb183cb9`; after applying the plugin changes there, all 11 focused static/WebServer tests pass with no skips. In the main checkout, `npm run lint_all`, `npm run ts-check_all` and all 271 backend/plugin/frontend tests pass with zero skips. Native builder passes `bash -n`; whitespace checks pass. No ARM64 package or end-to-end builder run was performed. The retained `build-eb183cb9` clone contains these test edits and must not be treated as a pristine deployment build.

## Disk cleanup

Removed only `build-bd4c47ef` and `build-00e5e628` from `~/.cache/vacuumstreamer-tools` (about 1.7 GiB allocated). Both clone binaries matched their copies in the sealed `valetudo_bd4c47ef_20261025` and `valetudo_00e5e628_20261027` packages. Their only tracked changes were npm's executable-bit change on `mcp-server/index.js`; those diffs and commit/hash records were preserved in `~/.cache/vacuumstreamer-tools/cleanup-record-20261031`. No backup packages were removed. `df -h /` reported 13 GiB available afterward (12 GiB before this session's cleanup).

## Remaining decisions and observations

- PR 6 still requires an explicit yes: removing `/runtime/info` environment redaction and moving the Quirks paragraph have not been implemented.
- The robot log contained MQTT keepalive/connack timeouts earlier in this boot, followed by reconnections, and a 23.853-second refresh at 05:13:50 UTC. These predate the GUI checks. The final `/api/v2/mqtt/status` check returned HTTP 200 with state `ready` (9 connects, 14 reconnects, 14 errors). Do not carry the previous handoff's error-free observation forward as a claim about this boot. No MQTT configuration was changed by this session.
- Quirks MQTT registration remains the separate decision described by the fork-diff triage; it was not changed here.
