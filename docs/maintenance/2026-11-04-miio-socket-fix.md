# 2026-11-04 miIO socket and plugin bounds fix: deployed and verified

The owner deployed `db6adc04` as `miio1103` on November 4, finishing at 20:08:57 EST (November 5 01:08 UTC). The binary gate and the 12/12 reboot gate passed, and so did the post-deploy checks. It replaces `c0fe6c1b` (`sync1101`).

## What changed

This deploy fixes the three candidates from the interrupted 2026-11-03 Codex Standard scan, validated by Claude Code (see `CLAUDE.md`, Security Review Status):

- **miIO local socket** ([PR #52](https://github.com/Chorty/Valetudo/pull/52), merge `db6adc042f4fe926db98f78c3b1823c645aec003`):
  - When the robot address is `127.0.0.1`, `MiioValetudoRobot` binds the local miIO socket to `127.0.0.1` instead of all interfaces.
  - `MiioSocket`'s new `acceptOnlyFromPeer` option drops datagrams from anything other than the configured peer, so another host can no longer take over the peer or the token. It is on for the local socket whenever `ip` is an IP literal; the cloud socket behaves as before.
  - Pending requests are matched by own keys only, so a reply id such as `__proto__` can no longer throw.
  - Both upstream files mark the change "Fork change"; drop it once upstream fixes the issue.
- **Plugin bounds** ([plugin #16](https://github.com/Chorty/valetudo-vacuumstreamer-plugin/pull/16), `5ccddae8739c5d86e4e56db2e1e1bc93b490bdbc`):
  - Map imports unpack at most 64 MiB (was 512 MiB), staged under `/data/maploader` instead of RAM-backed `/tmp`.
  - TTS `play_file` accepts only a regular `.wav` or `.mp3` file of at most 50 MiB whose real path is under `/tmp` or `/data/vacuumstreamer/audio`.
- PR #52 also fixed the expired-certificate test for OpenSSL 4.x, updated the MCP `play_file` description, and bumped the plugin pointer.

Native source stays at `ac4645ffddd713edafc018257cef72b4cc77000a`; its runtime files were reinstalled unchanged because the reboot gate requires that stage.

## Validation and artifact

- All 283 backend/frontend/plugin tests and the MCP tests passed; lint and type checks were clean. Each new security test fails on the old code.
- PR #52's CI passed (build, CodeQL, tokei, Socket). Plugin #16 runs only Socket checks, which passed.
- `tools/build_valetudo.sh` built the merge commit from a clean detached clone: every step passed with zero pkg warnings, the embedded metadata names `db6adc04`, and the OpenAPI schema is present.
- Artifact `artifact_db6adc04/valetudo-aarch64`: 41,510,299 bytes, SHA-256 `3284a8d1361454818638ce2941c24d0cf8e5642f860046cb65794e1421e2c46b`.
- Private package `~/Documents/ValetudoBackups/valetudo_miio1103_20261103`, sealed with 38 files, contains:
  - fresh SSH credentials;
  - a robot file backup, with all 942 files verified and no mismatches;
  - the hardware partition images and identity;
  - the artifact and a pre-deploy baseline.

  It holds credentials and device identity, so keep it private. After the deploy, all 38 files still matched the seal.

## Pre-deploy baseline

Captured at 2026-11-04 03:57 UTC:

- The robot was in the middle of a segment clean at 93% (so the owner waited for it to dock).
- 52 capabilities, eight map layers, `vacuum_then_mop` among the presets.
- MQTT ready with zero errors.
- Active binary `1353cd8a…`.
- The local miIO socket was bound to `00000000:9D90` (0.0.0.0:40336).

## Executed deployment commands

The owner ran the package's script, which does the binary gate, the native install and the reboot gate in order. It is kept as the record; do not rerun it to verify:

```bash
bash /Users/mattjoslin/Documents/ValetudoBackups/valetudo_miio1103_20261103/DEPLOY_COMMANDS.sh
```

Its three commands, run from `/Users/mattjoslin/Documents/GitHub/vacuumstreamer`:

```bash
PKG=/Users/mattjoslin/Documents/ValetudoBackups/valetudo_miio1103_20261103
tools/deploy_binary.sh "$PKG/artifact_db6adc04/valetudo-aarch64" miio1103 "$PKG"
tools/deploy_native.sh ac4645ffddd713edafc018257cef72b4cc77000a miio1103
tools/deploy_reboot_gate.sh 3284a8d1361454818638ce2941c24d0cf8e5642f860046cb65794e1421e2c46b db6adc042f4fe926db98f78c3b1823c645aec003 miio1103
```

The binary gate passed at 20:06:27 EST. The native stage installed 17 files and kept the owner's `vacuumstreamer.conf`. After the reboot, health checks failed four times while Valetudo started, then passed 12 in a row by 20:08:52.

## Post-deploy verification

Run 2026-11-05 at about 01:19 UTC through a robot-terminated SSH tunnel. No cleaning or movement commands were sent.

- **Binary.** The installed `/data/valetudo` and the running `/proc/<pid>/exe` both hash to `3284a8d1…`, and the runtime version reports the full `db6adc04` commit. `/data/valetudo.predeploy_miio1103` hashes to `1353cd8a…` (`c0fe6c1b`). One watchdog is running, and `VALETUDO_SLOW_REQUEST_MS=500` is preserved.
- **miIO socket.** The local socket is now bound to `0100007F` (127.0.0.1), on an ephemeral port that changes with each boot; it was `00000000` before. Its receive queue and drop counter are 0. The firmware's own `miio_client` still listens on `0.0.0.0:54321`, which is firmware, not Valetudo. The log shows `IP 127.0.0.1`, `Dummycloud connected` and `MQTT configured`, with no exceptions or errors.
- **Robot state.**
  - Docked, dock idle, battery 100%, status flag `none`.
  - The same 52 capabilities; the presets still include `vacuum_then_mop`.
  - All eight map layers match the baseline exactly. The entity count went from 6 to 33 only because of the finished cleaning's path segments and a carpet entity.
  - Map management lists the same slots; `6 rooms 071826` is still active.
- **MQTT.** Ready, one connection, zero disconnects, reconnects or errors.
- **HTTPS and native.**
  - Robot-local HTTPS serves a verified certificate, and Valetudo answers 401 without a login.
  - Ports 80 and 443 are listening; 6971 is closed.
  - Caddy, go2rtc and the camera supervisor are running.
  - All 17 native files match their `.predeploy_miio1103` copies, which is expected for an unchanged reinstall. `vacuumstreamer.conf` is unchanged.
- **Camera.**
  - A cold `live.mp4` wake through the tunnel delivered its first byte in 1.3 s: 834,470 bytes in 12 s with 163 complete fMP4 fragments at 864×480.
  - macOS `avconvert` decoded a three-second sample (exit 0). That's an encoded-stream check, not a browser UI test. The recordings were removed afterwards.
  - The camera woke at 01:21:13 UTC. The supervisor stopped `video_monitor` at 01:24:28 UTC, after its normal 180-second no-viewer timeout. Final status: on-demand, unpaused, go2rtc running, capture stopped, no viewer.
- **Home Assistant.** Checked read-only on 2026-11-05 at 03:17 UTC (November 4, 22:17 EST) with one `GET /api/states`, against the `sync1101` baseline of 72 entity states. No buttons were pressed and no services were called.
  - All 72 entities are present, and none is newly unavailable. The vacuum is `docked`, and the three camera entities are `idle`.
  - Four optional camera-event helpers are still unavailable, as they were before this deploy and `sync1101`.
  - Nine sensors changed value. Eight are what one cleaning since the baseline would produce: the current and total statistics, and three consumable timers each down by 60. The ninth is Wi-Fi signal, which moved from −39 to −51 dBm.

Post-deploy responses and the owner's deploy output are kept privately in `~/Documents/ValetudoBackups/maintenance_20261104/miio1103-postdeploy/`.

## Rollback

To roll back:

1. Copy `/data/valetudo.predeploy_miio1103` (`c0fe6c1b`, `1353cd8a…`) over `/data/valetudo`.
2. Copy the matching `.predeploy_miio1103` native files back over the originals.
3. Reboot.

The miIO change touches only how the socket is bound and how incoming packets are accepted, so rolling back loses nothing except the fix.

## Still open

- **Upstream report.** Not posted. The owner finalized the text on 2026-11-05 and decided not to post it for now. PR #52 is already public.
- **Security review.** A manual review of the native companion and the parent ran on 2026-11-04; see `CLAUDE.md`, Security Review Status. Its findings are not fixed yet. No canonical security scan exists yet.
