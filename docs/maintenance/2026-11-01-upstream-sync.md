# 2026-11-01 upstream sync: deployed and verified

The owner deployed `c0fe6c1b` as `sync1101` on November 1, finishing at 20:34 EST (November 2 01:34 UTC). The binary gate and 12/12 reboot gate passed; post-deploy verification passed. This replaces `eb8e6336` (`followup1031`).

## Source and review

[PR #49](https://github.com/Chorty/Valetudo/pull/49) merged as `c0fe6c1b858b2f9098c51301324b8c400539f4de`, incorporating upstream through `06cfc72d8c507af5bcd906265d9a931300c4b60f` without conflicts:

- `50de90ab`: another Mova Z60 model ID.
- `209049bb`: accept signed miIO device IDs in `device.conf`, then cast to uint32 before encoding packets.
- `06cfc72d`: remove the outdated Q7 Max SkyHigh NAND note.

The current robot DID is a positive uint32 and is unchanged by the conversion. Five synthetic positive/signed IDs passed config parsing, getter caching and wire-header encoding checks without opening sockets. The merge preserves `ForcedGcPolicy`, secret redaction, L10S plugin overrides and plugin revision `179b4ed6bb2698c0057f0e1a879891ab2ef09d30`.

Native source is `ac4645ffddd713edafc018257cef72b4cc77000a`; its deployable runtime files are identical to the previous native `3ea10b4` runtime.

## Validation and artifact

All PR and branch CI checks passed, including lint, type checks, frontend build, the three backend target builds, backend/frontend/plugin tests, MCP tests and code analysis. This is not a completed repository security scan.

`tools/build_valetudo.sh` then built the exact merge commit from a clean detached clone. OpenAPI/code generation, lint, type checks, production frontend, all 271 backend/frontend/plugin tests and ARM64 packaging passed. Embedded metadata names the exact source commit; the OpenAPI schema is present and pkg emitted zero warnings. The build clone remained clean. Native `sh test/run_tests.sh dash` passed 296 shell checks and 11 Python tests.

- Artifact: `artifact_c0fe6c1b/valetudo-aarch64`, 41,509,241 bytes, static ARM64 ELF.
- SHA-256: `1353cd8ac17b4c513a3944f0b5d439bbf26ca2cbe6069c06464e45d0a1810d94`.
- Private package: `~/Documents/ValetudoBackups/valetudo_sync1101_20261101`.

Fresh backups passed all checks: six robot SSH key files matched; all 924 robot manifest files were verified (923 by extraction, the unreadable `valetudo.bak` by archive stream), with no mismatches; the decrypted private-partition image matched; all named hardware partitions except UDISK matched size and hash. U-Boot environment and hardware identity were captured. `seal_package.sh` re-verified all 37 included files. The package contains credentials and device identity and must remain private.

## Predeploy baseline

Read-only checks found the robot docked, dock idle, battery 100%, status flag `none`, 52 capabilities, eight map layers and `vacuum_then_mop` available. MQTT was `ready` with 99 accumulated errors and 99 reconnects already present before this update. Responses are saved privately under `predeploy_baseline/` for comparison.

The predeploy binary had SHA-256 `62b8f22659c057d3491fadc7c52cf1da3b41f52c974136704861e7f29b2d1be1`. The watchdog's `VALETUDO_SLOW_REQUEST_MS=500` override was present and these deploy stages do not replace the watchdog. Deploy ID `sync1101` was unused. The owner chose to leave UniFi settings unchanged; Wi-Fi work is deferred.

## Executed deployment commands

The project rule requires the owner to execute robot deployment scripts. The owner ran this script, which completed the binary gate, native install and reboot gate in order. These commands are retained as the deployment record; do not rerun them for verification:

```bash
bash /Users/mattjoslin/Documents/ValetudoBackups/valetudo_sync1101_20261101/DEPLOY_COMMANDS.sh
```

Its three commands, from `/Users/mattjoslin/Documents/GitHub/vacuumstreamer`, are:

```bash
PKG=/Users/mattjoslin/Documents/ValetudoBackups/valetudo_sync1101_20261101
tools/deploy_binary.sh "$PKG/artifact_c0fe6c1b/valetudo-aarch64" sync1101 "$PKG" &&
tools/deploy_native.sh ac4645ffddd713edafc018257cef72b4cc77000a sync1101 &&
tools/deploy_reboot_gate.sh 1353cd8ac17b4c513a3944f0b5d439bbf26ca2cbe6069c06464e45d0a1810d94 c0fe6c1b858b2f9098c51301324b8c400539f4de sync1101
```

The stages created `/data/valetudo.predeploy_sync1101` and matching native rollback copies. The binary rollback hash matches the previous `eb8e6336` artifact (`62b8f226…`). All 17 deployed native scripts/templates/boot files match `ac4645f` and their rollback copies; `vacuumstreamer.conf` matches its preserved copy.

## Post-deploy verification

- Installed and running `/proc/<pid>/exe` hashes both match `1353cd8a…`; runtime version reports the full `c0fe6c1b` commit. Local markers confirm the binary gate, native revision and reboot gate passed.
- Robot docked, dock idle, battery 100%, status flag `none`. The 52-capability list and operation-mode presets are identical to the predeploy baseline, including `vacuum_then_mop`. All eight map geometry layers match the baseline exactly.
- MQTT ready, one connection, zero disconnects/reconnects/errors since this boot. The predeploy error counters were historical and reset on reboot.
- Root/API, robot-local verified HTTPS, watchdog, go2rtc, camera supervisor and disabled HTTP bridge passed the read-only runtime health check. `VALETUDO_SLOW_REQUEST_MS=500` is preserved.
- HA: 72 matching entity states checked; vacuum docked and all three camera entities available. No newly unavailable entities. Four optional camera-event/recognized-people helpers have been unavailable since 22:06 UTC on November 1, before this deployment. Stateless buttons and the firmware-unsupported edge-extension frequency may show `unknown` as before.
- Camera relay: bounded `live.mp4` request received 686,017 bytes, with 134 complete MP4 media fragments and native 864×480 dimensions. macOS `avconvert` decoded/transcoded a three-second sample successfully (exit 0). This is an encoded-stream playback check, not a new Safari/Chrome UI check. Temporary recordings were removed after validation.
- The camera woke at 01:37:39 UTC, then the supervisor stopped `video_monitor` at 01:40:52 UTC after its normal 180-second no-viewer timeout. Final camera status: on-demand, unpaused, go2rtc running, capture stopped, no viewer.

Post-deploy API and credential-free HA summaries are stored privately in `~/Documents/ValetudoBackups/maintenance_20261101/sync1101-postdeploy/`. All 37 files in the original sealed backup were rechecked and still match its unchanged manifest; its excluded `DEPLOY_RECORD.txt` is updated with the result. No cleaning or motion was started. Wi-Fi settings remain unchanged at the owner's direction.
