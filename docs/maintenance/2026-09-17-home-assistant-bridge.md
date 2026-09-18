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
| `rest_command.vacuum_set_mic_volume`, `sensor.vacuum_mic_volume` | Preserve microphone gain through a replacement, or remove the controls while keeping the current gain. User preference pending. |
| `rest_command.vacuum_set_video_quality`, `sensor.vacuum_video_quality` | Preserve recorder configuration control through a replacement, or remove the controls while keeping current settings. User preference pending. |
| `rest_command.vacuum_play_ogg` | No active caller found. Retire it or provide compatible OGG playback before shutting down its endpoint. The existing TTS file player uses `aplay` for non-MP3 files and is not a verified OGG replacement. |

The native bridge quality handler edits capture/encoder settings in `recorder.cfg`; it is not the old plugin's no-op quality label. A replacement must respect the current camera supervisor and absolute nice-level helper when restarting capture.

The active YAML and vacuum-related dashboard/custom-integration audit found no remaining bridge obstacle-photo consumer. An occurrence of the digits `6971` in `custom_components/valetudo/res/icons.js` is an SVG coordinate, not a URL.

`HTTP_BRIDGE` remains **on**, restricted to `192.168.1.106`. Turning it off now would break the controls above.

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

The physical joystick disable-stops test remains open. A successful disable call while stationary cannot establish that a moving robot stops. The user has been asked to supervise in a clear, level area away from stairs.

### Upstream

Fetched `origin` and `fork`. `origin/master` remains `190816db`, already contained in local/fork `master` `64a6fb85`. No merge, source build, or deployment was needed. The deployed binary remains `a959c53f`, plugin `eaf1551`, native runtime `cd71f8b`. Preserve `ForcedGcPolicy` when reviewing future upstream changes.

## Backups and rollback

Private Mac evidence archive:

`/Users/mattjoslin/Documents/ValetudoBackups/bridge_migration_20260917`

The archive includes original and candidate YAML, the original cleaning dashboard, map backup/readbacks, validation results, and the maintenance scripts. `SHA256SUMS.json` verifies 25 files. It contains private HA configuration; do not commit its contents.

On Home Assistant:

- `/config/configuration.yaml.pre-valetudo-bridge-20260917T181241` is the configuration before either batch.
- `/config/valetudo-bridge-backup-20260917T181524/` contains the configuration after batch one, original scripts/automations, and original cleaning-dashboard JSON.

For a full rollback, restore the pre-first-batch configuration and the original scripts/automations, validate with HA's configuration check, then reload REST commands, REST sensors, scripts, and automations. Restore the dashboard JSON through `lovelace/config/save` for `dashboard-cleaning`; do not overwrite live `.storage` files. No robot rollback is needed: runtime configuration was unchanged and Foyer's material was already restored.

SSH access to HA using the two saved workspace password fields was rejected. Authenticated HA REST/WebSocket and the existing SMB credentials worked. Secrets were read from the workspace `.env`, not copied into source.

API references used: [Home Assistant REST API](https://developers.home-assistant.io/docs/api/rest/), [RESTful Command](https://www.home-assistant.io/integrations/rest_command/), and [WebSocket API](https://developers.home-assistant.io/docs/api/websocket/).
