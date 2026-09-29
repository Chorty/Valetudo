# Next-session handoff — 2026-09-28

This supersedes the [2026-09-26 handoff](2026-09-26-next-session-handoff.md). Read `CLAUDE.md` and `MEMORY.md` for the operating rules and full history. Verify deployment facts again before acting on them.

## What changed on 2026-09-28

A read-only review of the HTTPS and authentication paths (Codex thread `01a0e0b0-3272-7290-8551-d3c45198059d`) found five problems. Codex implemented fixes for all of them. The session hit its limit during wrap-up, and Claude Code session `d3102980-8c62-48cd-9190-135d9078e749` finished the changes and merged them. **Nothing has been deployed.** The robot and Home Assistant still run the 2026-09-26 state.

| Finding | Fix | Merged |
|---|---|---|
| MCP and the native Mac tools sent Basic Auth over LAN HTTP | MCP requires verified HTTPS or literal-loopback HTTP (an SSH tunnel that ends on the robot) and refuses redirects. Native tools run curl on the robot against loopback | Valetudo #24 (`3ef26086`), native #15 (`dde1fb6`) |
| The profiler could not authenticate (every sample was a 401) | Keychain Basic Auth, an authenticated preflight, and a run with any failure reported `FAILED` with exit 1 | Valetudo #24 |
| Certificate activation could report success while HTTPS was broken | One locked `install` transaction with a journaled symlink switch. The robot confirms the served leaf, then HA verifies it and sends `commit`; anything else rolls back | native #15 |
| Every daily 03:00 install stopped Caddy, even for an unchanged certificate | An unchanged pair is verified but never reloaded. A changed pair reloads through `SIGUSR1` | native #15 |
| The restricted SSH upload had no size limit | Length-framed, at most 96 KiB, 12 s deadline | native #15 |

A 30-minute Home Assistant monitor of the certificate actually served is also added (native #15). CodeQL flagged a test that set `NODE_TLS_REJECT_UNAUTHORIZED=0`; the test now asserts the explicit option instead. The final CI run passed with no alerts.

Tests at merge: backend 246/246, MCP 13/13, native 293/293 in dash plus 11 installer tests with real OpenSSL.

## Published source

| Component | Default branch | Running |
|---|---|---|
| Valetudo parent | `master` `3ef26086` (PR #24) | `261bf1ff`. Every change since is Mac-side (MCP, profiler) or docs, so no rebuild is needed |
| Native companion | `master` `dde1fb6` (PR #15) | Runtime `b6fb8bb`. The certificate scripts in #15 **need deployment** |
| Plugin | `main` `b02e72e` | Unchanged |

No MCP client on this Mac is configured with the old `VALETUDO_HOST=192.168.1.31`, which the new MCP code rejects (checked in `~/.claude.json` and `~/.codex/config.toml`).

## Deploy plan (not yet approved)

This is a native-only deploy. Robot and Home Assistant must be updated in the same session. The robot now accepts only `install`, and the current HA script sends `cert`/`key`/`activate`. A mismatch is safe: the 03:00 job fails with its notification and the served certificate (valid to 2026-12-25) stays. Let's Encrypt renews about 30 days before expiry, so deploy before about **2026-11-20**.

Choose a window clear of HA's 02:00 and 03:00 certificate jobs and the Dreame maintenance reboot (03:00–05:00 UTC). Keep the robot docked and idle. Use a deploy ID such as `certtx<MMDD>`.

1. **Back up.** `backup_ssh.sh`, `backup_robot.sh`, `backup_hardware.sh`, then `seal_package.sh` into `~/Documents/ValetudoBackups/valetudo_261bf1ff_<date>_certtx`. No build is needed. The Mac had 7.1 GiB free on 2026-09-28.
2. **Keep the binary.** `tools/deploy_keep_binary.sh <id> "$PKG"`.
3. **Install the native scripts.** `tools/deploy_native.sh dde1fb6 <id>`. This adds `https_cert_state.sh` and replaces `https_cert_install.sh` and `https_proxy.sh`, with `.predeploy_<id>` copies. The Caddyfile is unchanged.
4. **Reboot gate.** `tools/deploy_reboot_gate.sh 7e6e059748d7ed37d07c32f0fa92f6a50eded48dbf6959afa04e393f29c8689c 261bf1ff <id>`. `https_proxy.sh` is a long-running loop, so it changes only after a reboot. Afterwards confirm that Caddy is running, `credentials/https-pending` is absent, and HA's 16 REST sensors are available.
5. **Update Home Assistant.** Back up `/config/valetudo_https_cert_sync.sh`, `configuration.yaml`, and `automations.yaml`. Copy `tools/ha_https_cert_sync.sh` and `tools/ha_https_cert_sync.py` to `/config/valetudo_https_cert_sync.{sh,py}` at mode 0700. Add `valetudo_https_cert_check: /config/valetudo_https_cert_sync.sh check` under `shell_command`, and add the `valetudo_robot_certificate_monitor` automation from `tools/ha_https_automations.yaml`. Run the config check, reload automations, and restart Core if Developer Tools offers no YAML reload for shell commands.
6. **Verify live.**
   - `shell_command.valetudo_https_cert_check` returns 0, and the monitor notification clears.
   - `shell_command.valetudo_https_cert_sync` returns 0. The pair is unchanged, so it is verified and not reloaded: the Caddy PID stays the same and no `https-generations/` directory remains.
   - The 16 sensors stay available. The Mac still gets 403 on port 443.
7. **Rollback.** On the robot, `deploy_reboot_gate.sh` restores the preserved files automatically if it fails. Otherwise copy the `.predeploy_<id>` files back and reboot; a leftover `https_cert_state.sh` is harmless. On HA, restore the three backups and restart Core.

**Only the real renewal can test this path.** Step 6 exercises the unchanged-pair path. The first changed pair, and with it the one-time conversion of the PEM files into `https-generations/` symlinks, runs only at the real renewal. It is covered by local tests, automatic rollback, the 03:00 failure notification, and the 30-minute monitor. Check the robot and HA the morning after the renewal.

## After deploying

- **Profiler baseline.** `tools/profiles.sh <prefix>` now profiles through a robot-terminated SSH tunnel. Its latency includes SSH and dropbear CPU, so record a fresh docked baseline at matched uptime before gating on regressions. Never start a cleaning for a benchmark.
- **Optional direct HTTPS for the Mac and iPhone.** Reserve their addresses on the router. On the iPhone, set Private Wi-Fi Address to Fixed. Then add the addresses to `remote_ip` in `https_proxy.Caddyfile` and deploy natively. The Let's Encrypt certificate is already trusted, so nothing is installed on the devices. This works on the LAN only.

## Still open from earlier

- **Preset 3:** the vacuum-then-mop sequence is unverified; the owner waived the test. Observe only a cleaning the owner starts.
- **HA camera card:** the play/pause check with the owner.
- **Routine:** preserve the robot watchdog override `VALETUDO_SLOW_REQUEST_MS=500`, and check disk space before builds.
- **Security scan:** a canonical Standard or Deep Scan is still needed.
- **Lower priority:** `MEMORY.md` work-list items 7–12.
