# Next-session handoff — 2026-09-26

Read `CLAUDE.md` and the latest handoff and work list in `MEMORY.md` for the operating rules and full history. This page is the short starting point. Deployment facts below were last checked on 2026-09-26; verify them again before making a new deployment decision.

## Published source and deployed state

| Component | Published default branch at handoff | Running on robot |
|---|---|---|
| Valetudo parent | `Chorty/Valetudo` `master` `aa881436` (docs PR #22) | `261bf1ff` from PR #21; later parent changes are docs and a docs-only plugin pointer |
| Native companion | `Chorty/vacuumstreamer` `master` `6ecf58f` (docs PR #14) | Runtime `b6fb8bb` from PR #13; all 16 deployed runtime files matched merged source |
| Plugin | `Chorty/valetudo-vacuumstreamer-plugin` `main` `b02e72e` (docs PR #7) | Valetudo binary built with `6665f1d`; later plugin changes are docs only |

At handoff all three local default branches were clean and matched their tracking refs. The last PR audit found no open PRs in these forks. Fetch and check again before claiming remote status. Native PR #12 was closed as redundant after PR #13 merged. Historical parent branches `dreame_map_snapshot` and `tcp_cloud` are pushed but unmerged prototypes, not missed rollout changes.

The robot has Basic Auth enabled, `HTTP_BRIDGE=off`, port 6971 closed, and `HTTPS_PROXY=on`. Caddy v2.11.4 serves the robot-only certificate on port 443 to Home Assistant's LAN address and robot localhost. The installed/running Valetudo binary hash and Caddy hash matched the pinned artifacts at the last parity check. No new robot deployment is needed solely because the published documentation commits are newer.

Home Assistant's 25 REST commands and 16 REST sensors use verified HTTPS at `mattjoslin-valetudo.duckdns.org`; the robot name resolved to `192.168.1.31` from HA. All 16 sensors were available after Core restart. The separate Let's Encrypt app checks renewal daily at 02:00, and HA attempts certificate installation daily at 03:00 with persistent notification on install failure or approaching expiry. The certificate observed at handoff expires 2026-12-25. The running HA Core config-check API returned `valid`. A separate `ha core check` container failed on the pre-existing missing `/media/recording` mount; treat that as a separate environment check, not proof that the HTTPS configuration failed.

Native tests passed 306/306 in both `dash` and `sh`; the HTTPS reboot gate passed 12/12. Low and high RTSP profiles each decoded 45 H.264 frames at 864x480 without the former high-profile green smear. The mic and video quality automation guards were verified settling after updates. These are results from the rollout, not a substitute for testing future changes.

## Remaining work

1. **Credential transport and profiler:** Mac deploy tools and MCP still use HTTP with Basic Auth on the private LAN. Review a verified TLS route for Mac clients before changing transport. `npm run profile_vacuum_resources` lacks Basic Auth support and receives 401; any fix must keep credentials out of process arguments, logs, URLs, and output files.
2. **Preset 3 behavior:** PR #21 restored `VACUUM_THEN_MOP: 3`; the firmware stored and reported mode 3 while docked. The owner waived a supervised cleaning as a rollout gate. The vacuum pass followed by a mop pass is unverified. Only observe a cleaning the owner starts; do not start one for a test. Remove the preset if observed behavior is wrong.
3. **Camera card:** The Home Assistant camera-card play/pause behavior remains to be checked with the owner. The optional Valetudo UI player is lower priority.
4. **Routine maintenance:** Check available Mac disk space before any build. Preserve the owner's robot watchdog override `VALETUDO_SLOW_REQUEST_MS=500`. Recheck certificate renewal and the HA install notification path near renewal, without copying tokens or keys into the repository.

An independent, read-only review of the certificate installer, restricted SSH command, Caddy allowlist, renewal failure handling, and Mac credential path would benefit from a high-reasoning model. Implementation and test maintenance can proceed after the review identifies a concrete change. Do not move, clean, reboot, or change settings on the robot as part of a review.

## Source of detail

- `CLAUDE.md`: architecture, access rules, deployed hashes, build and rollback practice.
- `MEMORY.md`: latest handoff, work-list history, and the preset-3 decision.
- `docs/maintenance/2026-09-17-home-assistant-bridge.md`: HA migration, HTTPS verification, backups, and rollback.
- Native `README.md` and `tools/README.md`: current companion use and deploy commands.
