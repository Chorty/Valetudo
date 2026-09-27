# Home Assistant bridge migration — 2026-09-17

Requested work: retire Home Assistant's port 6971 dependencies, verify the upstream joystick/material changes, and check upstream for new commits.

## Applied Home Assistant changes

Target: Home Assistant 2026.9.2. No robot firmware or native runtime files changed.

The active `configuration.yaml` initially contained 54 bridge references: 29 commands and 25 sensors. It now contains five. All unrelated configuration sections, scripts, automations, and dashboard content were preserved.

- Twenty-five REST command definitions now send JSON directly to native Valetudo capability endpoints. These include basic controls, presets, manual driving, segment cleaning, obstacle-image settings, obstacle avoidance, key lock, DND, quirks, go-to, speaker volume, locate, and TTS. Command names remain compatible with existing callers. JSON templates use `to_json`, including text containing quotes, backslashes, or newlines. Segment requests now include the required `start_segment_action` action.
- Twenty-one REST sensors now read native capability endpoints or state attributes. Their entity names remain unchanged.
- The cleaning dashboard's statistics card uses the existing MQTT count/time/area sensors, including their actual units. The bridge statistics sensor was removed from configuration.
- Drive speed stays in `input_number.vacuum_drive_speed`, which the movement scripts already use. Removed the redundant bridge setter, sensor, forwarding automation, and startup overwrite. The dashboard reads the helper directly.
- `vacuum_speak` and `vacuum_speak_from_input` use `notify.valetudo_cleanusmaximus_speak` through `notify.send_message`.
- `vacuum_drive_disable` first stops all four `vacuum_drive_*_hold` scripts, then sends disable. This prevents an already-running hold loop from issuing more movement requests after disable.

Two configuration checks returned `valid`. REST commands/sensors, scripts, and automations were reloaded; Home Assistant was not restarted. The dashboard was saved through the authenticated WebSocket API and read back exactly.

### Remaining bridge dependencies

| Command or sensor | Remaining work |
|---|---|
| `rest_command.vacuum_set_mic_volume`, `sensor.vacuum_mic_volume` | User chose native replacements (2026-09-17). `MicrophoneGainCapability` (REST plus a Home Assistant number entity) is deployed (2026-09-23). The two mic automations were repointed to it on 2026-09-24 (loop-guarded; see `MEMORY.md` work-list item 2); these two definitions were removed with the bridge later on 2026-09-24. |
| `rest_command.vacuum_set_video_quality`, `sensor.vacuum_video_quality` | Repointed to `RecorderQualityCapability` on 2026-09-24; both bridge definitions were later removed. The deployed `high` profile is 864x480/15 fps/2 Mbps and decoded cleanly. The original 640-wide profile produced an 864-wide SPS and green smear. Backup: `/Users/mattjoslin/Documents/ValetudoBackups/ha_video_quality_repoint_20260924T185939Z`. |
| `rest_command.vacuum_play_ogg` | No active caller was found, so this definition was removed with the bridge on 2026-09-24. The existing TTS file player was not treated as a verified OGG replacement. |

The native bridge quality handler edits capture/encoder settings in `recorder.cfg`; it is not the old plugin's no-op quality label. The replacement, `recorder_quality_ctl.sh`, restarts `video_monitor` through `video_monitor_launch.sh` (absolute nice 10) under the same `camera.lock` as `camera_wake.sh`; the bridge handler's raw `LD_PRELOAD` restart ran at nice 0 and would have undone the video-priority fix.

The active YAML and vacuum-related dashboard/custom-integration audit found no remaining bridge obstacle-photo consumer. An occurrence of the digits `6971` in `custom_components/valetudo/res/icons.js` is an SVG coordinate, not a URL.

**Later state, 2026-09-24:** the five remaining bridge definitions were removed after the mic and video controls were repointed. `HTTP_BRIDGE=off` is deployed and port 6971 is closed. Valetudo Basic Auth is enabled; the Mac deploy tools use the `valetudo-basic-auth` keychain entry. The original migration details above describe the state on 2026-09-17.

**HTTPS cutover, 2026-09-26:** the robot-only Let's Encrypt certificate was installed over a dedicated HA-to-robot SSH key restricted to the fixed certificate installer. Caddy serves verified HTTPS on port 443 only to HA (`192.168.1.106`) and robot localhost. `HTTPS_PROXY=on` passed the 12/12 reboot gate. HA's 25 REST commands and 16 REST sensors now use `https://mattjoslin-valetudo.duckdns.org` with `verify_ssl: true`; all 16 sensors were available after HA Core restart. The daily 02:00 renewal check and 03:00 installation attempt are enabled, with a persistent failure/expiry notification. HA's `/config/configuration.yaml.pre_valetudo_https_20260925` and `/config/automations.yaml.pre_valetudo_https_20260925` are exact rollback copies. The running Core's config-check API returned `valid`. The separate `ha core check` container reported the pre-existing `/media/recording` path as missing, so its failure did not establish a problem in the HTTPS changes. HA resolved the robot name to `192.168.1.31`, returned 401 without/wrong Basic Auth and 200 with the stored login; an authenticated Mac request got 403, and an empty trust store rejected the certificate. No cleaning or robot movement was started.

**Post-merge verification, 2026-09-26:** native PR #13 merged and PR #12 closed as redundant. The robot's 16 deployed native runtime files match the merged source byte for byte; the installed and running Valetudo and Caddy binaries match their pinned hashes. No robot redeploy was needed. The owner waived a supervised preset-3 cleaning as a rollout gate; its vacuum-then-mop sequence remains unverified.

**Documentation follow-up, 2026-09-26:** native PR #14 corrected the published HTTPS, camera-login, and install instructions; plugin PR #7 documented the mic and recorder controls. Parent docs PR #22 merged as `aa881436` and advanced the plugin pointer to `b02e72e`. These changes do not require a robot binary rebuild. The [next-session handoff](2026-09-26-next-session-handoff.md) records the remaining checks.

## Verification

- All 25 command templates rendered valid JSON through HA's template renderer. Twenty-four passed the local Valetudo OpenAPI schemas; the TTS contract was checked against its plugin router because that route is absent from the generated core schema.
- All 21 migrated sensor templates were evaluated against live responses and their HA entities were available after reload.
- Same-value HA-to-Valetudo checks for speaker volume, carpet mode, and auto-empty interval returned HTTP 200. Manual-control disable also returned HTTP 200; manual control remained disabled and the robot remained docked/idle.
- `script.vacuum_speak` reached the native MQTT notify entity; real `speaking: true` was observed and playback returned idle.
- The removed statistics sensor briefly remained as a stale HA state after reload, and the removed drive-speed automation remained as an unavailable restored registry entry. Neither is referenced by the migrated dashboard/automation configuration. Do not mistake their presence in the state machine for an active configured bridge dependency.
- The existing disabled nightly-cleaning triggers were preserved. No cleaning or nonzero movement command was issued.

### Map material test

Before writing, backed up `/data/ri`, `/data/map`, `/data/DivideMap`, and `/data/config/ava/mult_map.json` to a valid gzip tar archive. SHA-256: `9ae41a4110fb9f29ad7b009a2d25976876d08f6a5d0fd92c583793159b1ed02d`.

On vendor map ID **221**, changed Foyer (segment **5**) from `wood_vertical` to `tile`, observed `tile` in the live map, and restored `wood_vertical` with readback. Other segment materials were checked throughout; the robot stayed docked/idle.

**Physical joystick disable-stops test: passed 2026-09-17.** During a supervised manual-driving test, the robot stopped immediately, turned in the expected directions shown by the live video, and kept the video smooth while moving. A read-only follow-up confirmed manual control disabled, the robot docked with no error flag, and the dock idle. This establishes what the stationary disable check above could not.

### Upstream

Fetched `origin` and `fork`. `origin/master` remains `190816db`, already contained in local/fork `master` `64a6fb85`. No merge, source build, or deployment was needed. The deployed binary remains `a959c53f`, plugin `eaf1551`, native runtime `cd71f8b`. Preserve `ForcedGcPolicy` when reviewing future upstream changes.

## Follow-up: polling redundancy fix (same day, later session)

A review of this migration found five of the 21 migrated REST sensors were pure duplicates of native, MQTT-pushed entities that already existed: `sensor.vacuum_status`, `sensor.vacuum_battery`, `sensor.vacuum_mode`, `sensor.vacuum_fan_speed`, and `sensor.vacuum_water_usage` polled `/api/v2/robot/state/attributes` every 30-60s for data already available, unpolled, from `vacuum.valetudo_cleanusmaximus` (state, fan_speed), `sensor.valetudo_cleanusmaximus_battery_level`, and the `select.valetudo_cleanusmaximus_{mode,fan,water}` entities. Given how much of this project's effort has gone into Valetudo's request latency under load, running ~9 redundant REST polls/minute against it was worth removing.

Audited all references first (one dashboard card pair, one automation) before touching anything:

- `configuration.yaml`: removed the five REST sensor blocks (1568 bytes).
- `automations.yaml`: `vacuum_controls_sync_on_startup` now sources `select.valetudo_cleanusmaximus_{mode,fan,water}` directly instead of the removed sensors. `sensor.vacuum_video_quality` (remaining bridge item, untouched) was left alone.
- `dashboard-cleaning`: the Battery and Status mushroom-entity cards now point at `sensor.valetudo_cleanusmaximus_battery_level` and `vacuum.valetudo_cleanusmaximus`.

Applied with the same discipline as the batches above: remote backup (`valetudo-polling-fix-backup-20260917T222616`, verified byte-for-byte), `config/core/check_config` returned `valid`, `rest`/`automation` domains reloaded, dashboard saved and read back, robot confirmed docked/idle throughout (no robot commands sent -- this only touched Home Assistant config). Live-verified afterward: the five removed entities show frozen `last_updated` timestamps (unchanged across a 35-minute window) confirming they're no longer polled, and all five native replacements report correct live values. The four surviving orphaned states (all but battery) will clear on Home Assistant's next restart, the same known behavior already documented above for `sensor.vacuum_total_statistics`.

## Backups and rollback

Private Mac evidence archive:

`/Users/mattjoslin/Documents/ValetudoBackups/bridge_migration_20260917`

The archive includes original and candidate YAML, the original cleaning dashboard, map backup/readbacks, validation results, and the maintenance scripts. `SHA256SUMS.json` verifies 25 files. It contains private HA configuration; do not commit its contents.

On Home Assistant:

- `/config/configuration.yaml.pre-valetudo-bridge-20260917T181241` is the configuration before either batch.
- `/config/valetudo-bridge-backup-20260917T181524/` contains the configuration after batch one, original scripts/automations, and original cleaning-dashboard JSON.

For a full rollback, restore the pre-first-batch configuration and the original scripts/automations, validate with HA's configuration check, then reload REST commands, REST sensors, scripts, and automations. Restore the dashboard JSON through `lovelace/config/save` for `dashboard-cleaning`; do not overwrite live `.storage` files. No robot rollback is needed: runtime configuration was unchanged and Foyer's material was already restored.

At the time of the 2026-09-17 migration, the `.env` HA SSH values were stale, so those failed logins did not test the then-known-good access path. The owner updated the SSH password on 2026-09-26; the existing Advanced SSH & Web Terminal app then accepted it and was used for the HTTPS cutover. The dedicated certificate-install key remains only in HA `/config/.ssh`, not in this repository. Secrets were not copied into source.

API references used: [Home Assistant REST API](https://developers.home-assistant.io/docs/api/rest/), [RESTful Command](https://www.home-assistant.io/integrations/rest_command/), and [WebSocket API](https://developers.home-assistant.io/docs/api/websocket/).
