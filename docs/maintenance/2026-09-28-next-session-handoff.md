# Next-session handoff — 2026-09-28

This supersedes the [2026-09-26 handoff](2026-09-26-next-session-handoff.md). Read `CLAUDE.md` and `MEMORY.md` for the operating rules and full history. Verify deployment facts again before acting on them.

## What changed on 2026-09-28

A read-only review of the HTTPS and authentication paths (Codex thread `01a0e0b0-3272-7290-8551-d3c45198059d`) found five problems. Codex implemented fixes for all of them. The session hit its limit during wrap-up, and Claude Code session `d3102980-8c62-48cd-9190-135d9078e749` finished the changes and merged them. **The same evening they were deployed as `certtx0928`**; see [Deploy result](#deploy-result).

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
| Native companion | `master` `dde1fb6` (PR #15) | Runtime `dde1fb6`, deployed 2026-09-28 (`certtx0928`) |
| Plugin | `main` `b02e72e` | Unchanged |

No MCP client on this Mac is configured with the old `VALETUDO_HOST=192.168.1.31`, which the new MCP code rejects (checked in `~/.claude.json` and `~/.codex/config.toml`).

## Deploy plan (executed 2026-09-28)

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

## Deploy result

Run 2026-09-28 20:54–21:27 EDT with the owner's approval; robot docked and idle throughout.

- Backup `~/Documents/ValetudoBackups/valetudo_261bf1ff_20260928_certtx`: sealed with 814 files verified and 0 mismatches. `DEPLOY_RECORD.txt` has the hashes and the rollback steps.
- Before the deploy, all 16 robot runtime files matched `b6fb8bb`. `deploy_native.sh dde1fb6` changed only the three certificate scripts. The reboot gate passed 12/12 with runtime `261bf1ff` and `HTTPS_PROXY=on`.
- After the reboot, Caddy served the installed leaf (valid to 2026-12-25) with no `https-pending`. Robot-local requests without a login got 401; the Mac got 403.
- HA: files installed with repo-matching hashes; config check `valid`; Core restarted. The monitor automation was added through the config API; HA was reached over the SSH app and the Supervisor proxy, so no token crossed the LAN.
- The check command returned 0. The install command returned 0 on the unchanged-pair path with the same Caddy PID, no journal and an empty `https-generations/`. The monitor ran and created no notification. HA entities matched the pre-deploy baseline.
- After the Core restart, the Supervisor's API proxy returned 502 for a few minutes while the web UI already answered 200. It recovered on its own.

## After deploying

- **First real renewal (about 2026-11-25).** The next morning, confirm that there is no HA notification, that `credentials/https-current` points into `https-generations/`, and that `https-pending` is absent.

- **Profiler baseline: done 2026-09-28, 21:55–22:25 EDT.** `tools/profiles.sh certtx0928` ran all three docked scenarios through the tunnel. All were valid with zero failures and isolated p95 of 139.2/126.4/121.4 ms. Native #18 tunnels the RTSP viewer, which `CAMERA_LOGIN=on` had broken since 2026-09-15, and #19 makes these runs the default baselines. See `CLAUDE.md`. Never start a cleaning for a benchmark.
- **Optional direct HTTPS for the Mac and iPhone.** Reserve their addresses on the router. On the iPhone, set Private Wi-Fi Address to Fixed. Then add the addresses to `remote_ip` in `https_proxy.Caddyfile` and deploy natively. The Let's Encrypt certificate is already trusted, so nothing is installed on the devices. This works on the LAN only.

## Still open from earlier

- **Preset 3:** the vacuum-then-mop sequence is unverified; the owner waived the test. Observe only a cleaning the owner starts.
- **HA camera card:** the play/pause check with the owner.
- **Routine:** preserve the robot watchdog override `VALETUDO_SLOW_REQUEST_MS=500`, and check disk space before builds.
- **Security scan:** a canonical Standard or Deep Scan is still needed.
- **Lower priority:** `MEMORY.md` work-list items 7–12.
