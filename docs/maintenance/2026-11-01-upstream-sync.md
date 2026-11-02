# 2026-11-01 upstream sync: ready for owner deployment

The source sync is merged and its deployment package is ready. The robot still runs `eb8e6336` (`followup1031`); no deploy stage has run.

## Source and review

[PR #49](https://github.com/Chorty/Valetudo/pull/49) merged as `c0fe6c1b858b2f9098c51301324b8c400539f4de`, incorporating upstream through `06cfc72d8c507af5bcd906265d9a931300c4b60f` without conflicts:

- `50de90ab`: another Mova Z60 model ID.
- `209049bb`: accept signed miIO device IDs in `device.conf`, then cast to uint32 before encoding packets.
- `06cfc72d`: remove the outdated Q7 Max SkyHigh NAND note.

The current robot DID is a positive uint32 and is unchanged by the conversion. Five synthetic positive/signed IDs passed config parsing, getter caching and wire-header encoding checks without opening sockets. The merge preserves `ForcedGcPolicy`, secret redaction, L10S plugin overrides and plugin revision `179b4ed6bb2698c0057f0e1a879891ab2ef09d30`.

Native source is `ac4645ffddd713edafc018257cef72b4cc77000a`; its deployable runtime files are identical to deployed native `3ea10b4`.

## Validation and artifact

All PR and branch CI checks passed, including lint, type checks, frontend build, the three backend target builds, backend/frontend/plugin tests, MCP tests and code analysis. This is not a completed repository security scan.

`tools/build_valetudo.sh` then built the exact merge commit from a clean detached clone. OpenAPI/code generation, lint, type checks, production frontend, all 271 backend/frontend/plugin tests and ARM64 packaging passed. Embedded metadata names the exact source commit; the OpenAPI schema is present and pkg emitted zero warnings. The build clone remained clean. Native `sh test/run_tests.sh dash` passed 296 shell checks and 11 Python tests.

- Artifact: `artifact_c0fe6c1b/valetudo-aarch64`, 41,509,241 bytes, static ARM64 ELF.
- SHA-256: `1353cd8ac17b4c513a3944f0b5d439bbf26ca2cbe6069c06464e45d0a1810d94`.
- Private package: `~/Documents/ValetudoBackups/valetudo_sync1101_20261101`.

Fresh backups passed all checks: six robot SSH key files matched; all 924 robot manifest files were verified (923 by extraction, the unreadable `valetudo.bak` by archive stream), with no mismatches; the decrypted private-partition image matched; all named hardware partitions except UDISK matched size and hash. U-Boot environment and hardware identity were captured. `seal_package.sh` re-verified all 37 included files. The package contains credentials and device identity and must remain private.

## Predeploy baseline

Read-only checks found the robot docked, dock idle, battery 100%, status flag `none`, 52 capabilities, eight map layers and `vacuum_then_mop` available. MQTT was `ready` with 99 accumulated errors and 99 reconnects already present before this update. Responses are saved privately under `predeploy_baseline/` for comparison.

The active binary still has SHA-256 `62b8f22659c057d3491fadc7c52cf1da3b41f52c974136704861e7f29b2d1be1`. The watchdog's `VALETUDO_SLOW_REQUEST_MS=500` override is present and these deploy stages do not replace the watchdog. Deploy ID `sync1101` is unused. The owner chose to leave UniFi settings unchanged; Wi-Fi work is deferred.

## Owner action

The project rule requires the owner to execute robot deployment scripts. The reviewed script below runs the binary gate, native install and reboot gate in order, stopping if any stage fails:

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

The deploy stages will create `/data/valetudo.predeploy_sync1101` and matching native rollback copies. Those copies do not exist yet. Current rollback remains the `followup1031` rollback described in CLAUDE.md.

After the owner runs the stages, verify the 60-second binary gate and 12/12 reboot gate, running commit/hash, loaded map, 52 capabilities and preset 3, MQTT/HA availability, camera playback and watchdog override. A docked binary-only restart leaves the map empty until reboot, so assess it after the reboot gate. Do not start cleaning or move the robot. Record the actual deployment result in this file, CLAUDE.md and MEMORY.md through a docs PR.
