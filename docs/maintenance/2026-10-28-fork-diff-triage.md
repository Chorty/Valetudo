# Fork diff triage — 2026-10-28

Step 2 of shrinking the fork's diff against upstream Valetudo. Step 1 (plugin #10, parent #35, deployed as `plugin1027`) moved the L10S preset-3 and V1 mop-extension overrides and the Quirks and mop-dock MQTT handles into the plugin. This page lists every file where the fork differs from upstream, sorts each file into a category, and proposes the next small PRs. **It is a plan only. Nothing here has been implemented or deployed.**

**Base.** Fetched 2026-10-28. `fork/master` is `39144140` (plugin `8f26931`), and its merge-base with `origin/master` is `69c60625` (release 2026.10.0). All counts are `git diff 69c60625 fork/master`. Upstream has since moved to `209049bb` (two commits; see finding 3).

**Categories.**

- **a**: can move into the plugin, as step 1 did
- **a′**: can move out of an upstream file into a fork-only file in the parent. This is for frontend code, which can't live in the plugin. Total lines stay the same, but the upstream file stops conflicting
- **b**: must stay in the parent (the reason is in the appendix)
- **c**: could be dropped, because upstream already does the same thing or the change is obsolete
- **d**: fork-only tooling or docs that never conflict with upstream

## Summary

### Where the diff is today

| | Files | Lines |
|---|---|---|
| Whole repo | 89 (53 new, 36 modified) | +7,100 −137 |
| `backend/lib` + `frontend/src` (step 1's measure) | 36 | +1,432 −61 (PR #35's 1,414, plus 18 lines from PR #36) |
| Modified upstream files, excluding the lockfile (the conflict surface) | 35 | +361 −87 |
| `package-lock.json` | 1 | +735 −50 |

Totals by each file's main category (a file whose lines fall into several categories is counted once, under its main one; the appendix splits them):

| Category | Files | Lines |
|---|---|---|
| a: move into the plugin | 10 | +634 −1 |
| c: could be dropped | 6 | +196 −22 |
| b: must stay | 43 | +2,792 −114 |
| d: fork-only tooling and docs | 30 | +3,478 −0 |

### Candidates

| # | Change | Cat. | Lines out of the parent | Robot behavior change | Risk | PR |
|---|---|---|---|---|---|---|
| 1 | Voice-pack URL guard becomes a plugin router subclass | a | 43 lib + 59 test | None | Low | 1 |
| 2 | `ExtrFreq` quirk guard moves into `RobotOverrides.js` | a | 3 | None on the L10S | Low | 1 |
| 3 | Slow-request telemetry moves into the plugin behind a WebServer hook | a | 122 + 128 test, `env.js` 1, `middlewares/index.js` 1 | None | Low | 2 |
| 4 | Precompressed static assets and the `/static/` rate limit move into the plugin behind the same hook | a | 143 + 107 test, `middlewares/index.js` 1, WebServer.js about 22 | None | Medium (middleware order) | 2 |
| 5 | Frontend API interfaces leave `types.ts` for a fork-only side file | a′ | 0 total, 26 out of an upstream file | None | Very low | 3 |
| 6 | `App.tsx` devtools lazy-load dropped | c | 7 −2 | None; the bundle should be unchanged | Low (confirm with a build) | 3 |
| 7 | Root `express`/`@types/express` pins dropped | c | 2, plus 2 in the lockfile | None | Low | 4 |
| 8 | `mcp-server` leaves the root npm workspaces and gets its own lockfile | d→ | about 306 lockfile lines, plus the workspace entry | None (Mac-only) | Low | 4 |
| 9 | OpenAPI schema pkg-asset line dropped | c | 1 | None, if pkg still bundles the schema | Low–medium (confirm with a build) | 4 |
| 10 | `generate_build_metadata.js` returns to upstream | c | 63 −19, plus 66 test | None | Low | 5 |
| 11 | `/runtime/info` env redaction dropped | c, optional | 23 −1, plus 52 test | None today (finding 2) | Low; gives up future-proofing | 6 |
| 12 | Quirks note moves from upstream's docs page to the plugin README | c, optional | 4 | None | None | 6 |

**Projected result** after PRs 1–5, estimated from the line counts above:

| | Today | After PRs 1–5 | After PR 6 as well |
|---|---|---|---|
| `backend/lib` + `frontend/src` | 36 files, +1,432 | 29 files, about +1,089 | 28 files, about +1,066 |
| Modified upstream files, excluding the lockfile | 35 files, +361 −87 | 29 files, about +208 −64 | 27 files, about +181 −63 |
| `package-lock.json` | +735 −50 | about +415 | about +415 |
| Whole repo | +7,100 | about +6,020 | about +5,940 |

After this plan, most of what remains is plugin hooks, the frontend pages and their routing, ForcedGcPolicy, the single-flight MQTT refresh, the two secret-logging fixes, the `tar-stream` 3 dependency tree, and fork-only tooling.

## Findings to know first

1. **Quirks are not exposed over MQTT on the robot.** `/data/valetudo_config.json` (the path in Valetudo's `VALETUDO_CONFIG_PATH`) has an `optionalExposedCapabilities` list, but `QuirksCapability` is not in it. The plugin's `QuirksCapabilityMqttHandle` is `OPTIONAL = true`, so it is not registered. As a result, the Quirks MQTT path has no effect on this robot today: the plugin handle, `Quirk.mqttExposed`, the Midea flag, and the `QuirksCapability` entry in `Configuration.openapi.json`. This contradicts CLAUDE.md, which says Home Assistant has quirk controls, and the post-deploy check listed in PR #35. Home Assistant was not checked for this page. No change is proposed. If the owner does not want MQTT quirks, those parent lines and the plugin handle could go together, as a separate decision.
2. **No environment variable name on the robot matches the redaction pattern.** Valetudo (PID 1613) runs with `HOME PATH PWD SHELL SHLVL TERM USER VALETUDO_CONFIG_PATH VALETUDO_SLOW_REQUEST_MS boot_type partitions rotpk_status uboot_message`; only the names were read. None matches `secret|password|passwd|token|credential|auth|key`, so `/runtime/info` returns the same output with or without the fork's redaction.
3. **Upstream moved after the last sync.** `origin/master` is `209049bb`: `50de90ab` (another Z60 model ID) and `209049bb` (negative miIO device IDs). `209049bb` changes `MiioValetudoRobot.js` at about lines 178 and 546. The fork's only hunk in that file, the secret redaction at about line 497, does not overlap them, so the next sync should merge cleanly there.
4. **The root `express` pins do nothing today and could cause a mismatch later.** Upstream's own lockfile already hoists `express` 5.2.1 and `@types/express` 5.0.6 to the root `node_modules`, so the plugin resolves them without the pins. Inside the plugin, `express` is used only for JSDoc types and in one test. Suppose upstream later bumps express in `backend/package.json` but the root pin stays at 5.2.1. Then npm nests backend's copy, and the plugin resolves the old root one.
5. **The root `tar-stream` pin is needed.** The plugin's map import and export use `tar-stream` 3. Upstream already has `tar-stream` 2.2.0 as a dev-only dependency of `tar-fs` (pkg-fetch, prebuild-install). The root pin makes sure 3.2.0 takes the root slot that the plugin resolves. About 222 lockfile lines are the `tar-stream` 3 tree (`streamx`, `bare-*`, `b4a` and others, plus three re-nested `tar-fs` entries).
6. **CLAUDE.md is out of date about build metadata.** It says `util/generate_build_metadata.js` "records the commit only from a detached or `master` checkout". That describes upstream's version. The fork's current version uses `git rev-parse HEAD` and works from any checkout. After PR 5 the sentence is accurate again.

## Proposed PRs

Each PR follows step 1's order: the plugin PR is merged on `main` first, then a parent PR bumps the submodule. PRs 3–6 have no plugin half, because they touch only the parent's frontend, package metadata or tooling. Every parent PR must pass `npm run lint_all`, `npm run ts-check_all` and `npm test --workspace=backend`, which also runs the plugin and frontend tests.

Code that moves into the plugin is linted by the plugin's lighter `.eslintrc.json` instead of backend's `.automated.eslintrc.json`. `tsc` still checks it, because `backend/lib` requires it. Moved code must also run whatever `vacuumstreamer.conf` says, as `RobotOverrides.js` does: these are fork behavior, not VacuumStreamer switches.

### PR 1: voice-pack guard and `ExtrFreq` guard (plugin, then parent)

**Plugin.**

- Add `capability-routers/GuardedVoicePackManagementCapabilityRouter.js`. It extends upstream's `VoicePackManagementCapabilityRouter`. Its `initRoutes()` registers `this.router.put("/", this.validator, guard)` and then calls `super.initRoutes()`. For `action === "download"` with a `url`, the guard applies `IS_ALLOWED_VOICE_PACK_URL` and answers the same 400 and message as today. Anything else goes to `next()`. Register the class for `VoicePackManagementCapability` in `VacuumstreamerCapabilityRouterMappings.js`; that mapping is applied after upstream's entries, so it overrides them.
- In `RobotOverrides.js`, add a third override. It finds the `EDGE_EXTENSION_FREQUENCY` quirk in the robot's `QuirksCapability` and wraps its getter: it reads `MISC_TUNABLES` and returns `null` when `ExtrFreq` is absent, as the fork does now, and otherwise calls upstream's getter.
- Move `VoicePackManagementCapabilityRouter_test.js` into the plugin's `test/`. Add `RobotOverrides_test.js` cases for both branches of the getter.

**Parent.** `VoicePackManagementCapabilityRouter.js` and `DreameQuirkFactory.js` return to upstream. Delete the moved test and bump the submodule.

**Lines removed:** 46 from `backend/lib` and 59 from tests, which leaves two fewer upstream files touched.

**Risk.** Low. Without the `ExtrFreq` guard, upstream's getter throws on firmware that doesn't report `ExtrFreq`. `QuirksCapability.getQuirks()` would then log a warning and drop the quirk, removing it from the UI and Home Assistant. The override keeps it present with a `null` value. Moving the guard into the L10S-only `RobotOverrides.js` means other Dreame models get upstream's behavior back. That is no change on this robot.

**Verify.**

- Tests: the moved router cases all pass through the plugin mapping (loopback, link-local, IPv6, credentials and non-HTTP URLs give 400; LAN hosts are accepted), and the new override cases pass.
- An HTTP check against the aarch64 binary with `MockValetudoRobot` in a linux/arm64 container, as `798604ca` did: a loopback voice-pack URL gets 400.
- On the robot, read-only, after deploy: `GET /api/v2/robot/capabilities/QuirksCapability` still lists the edge-extension-frequency quirk, and `/tmp/valetudo.log` has no `Error while serializing quirk`. Don't send a voice-pack PUT to the robot. If the guard were broken, the firmware would act on the request.

### PR 2: WebServer extensions (plugin, then parent)

**Plugin.** Add `backend/VacuumstreamerWebServer.js` with two functions:

- `beforeRoutes(app)` installs the slow-request middleware. It reads `VALETUDO_SLOW_REQUEST_MS` from `process.env` itself.
- `frontendAssets(app, frontendBuildPath)` builds the asset index and installs the `/static/` rate limit (120 requests per 10 s), the precompressed middleware, and `express.static` for `/static/` with `immutable` and a one-year `maxAge`.

Move `SlowRequestMiddleware.js`, `PrecompressedStaticMiddleware.js` and their tests. `express-rate-limit` is already an upstream dependency and is hoisted to the root.

**Parent.**

- `WebServer.js` calls `beforeRoutes(this.app)` where it now installs `SlowRequestMiddleware`. It calls `frontendAssets(...)` just before upstream's own, unchanged `express.static(... "frontend/build")` line. The fork's third `express.static` call (`etag: true, maxAge: 0`) is the same as upstream's defaults, so upstream's line can serve that role. `WebServer.js` goes from +26 −1 to about +4.
- `middlewares/index.js` and `res/env.js` return to upstream.
- `frontend/scripts/build.js` stays: it still produces the `.br`/`.gz` sidecars. The middleware already falls back to uncompressed files when a sidecar is missing.

**Lines removed:** about 290 from `backend/lib` and 235 from tests, which leaves two fewer upstream files touched.

**Risk.** Medium-low. Middleware order is the only real risk. Slow-request timing must still start before the external-access check, and the `/static/` handlers must still run before upstream's catch-all static handler. Upstream's `compression()` already skips responses that carry `Content-Encoding`, as it does now.

**Verify.**

- Tests: the moved unit tests pass. Add a WebServer-level test with `MockValetudoRobot` that checks four responses:
  - a hashed JS asset requested with `Accept-Encoding: br` gets `Content-Encoding: br`, a JavaScript `Content-Type` and `immutable`
  - `index.html` gets an ETag and `max-age=0`
  - the 121st `/static/` request within 10 s gets 429
  - a response with `res.locals.longLivedStream` is not reported as slow
- On the robot, through the SSH tunnel: before and after the deploy, compare the headers for `/`, the main JS bundle, and one non-hashed file. Load the GUI and the Camera page in Chrome. The watchdog sets `VALETUDO_SLOW_REQUEST_MS=500`; check that the log has no "must be 0 or an integer" warning and no slow-request line for `live.mp4`.

**Deploy point.** PRs 1 and 2 change runtime code, so build and deploy after both are merged. Use the standard procedure: a fresh backup, candidate checksum, and the 60 s gate with automatic rollback. The boot path is unchanged. After a binary-only restart while docked, the map stays empty until a reboot, as always.

### PR 3: frontend tidy-up (parent only)

- Move `VideoStreamStatus`, `VideoStreamCommand`, `MapManagementMapEntry` and `MapManagementCommand` from `api/types.ts` into `api/VacuumstreamerApiClient.ts`; `api/index.ts` already re-exports it. Only the two `Capability` enum entries stay in `types.ts`. Upstream appends interfaces at the end of `types.ts`, exactly where the fork's lines are now, so this removes a recurring conflict.
- Return `App.tsx` to upstream. `@tanstack/react-query-devtools` 5.91.2 already exports `() => null` when `NODE_ENV` is not `development`, and the package is `sideEffects: false`. Webpack should therefore drop the devtools from the production bundle without the fork's lazy import.

**Lines removed from upstream files:** 33.

**Risk.** Very low for the types; it's a compile-time change. Low for `App.tsx`.

**Verify.** `ts-check_all`. Run the production frontend build before and after: the main-bundle gzip size and the bundle budgets should be unchanged, and the built JS should not contain `query-devtools`. If the devtools do appear, keep the fork's `App.tsx` and drop that half. On the robot after the next deploy: the GUI, the Camera page and the floor-management page load.

### PR 4: package metadata (parent only)

**Root `package.json`.**

- Remove the `express` and `@types/express` dev pins (finding 4).
- Remove `mcp-server` from `workspaces`. `mcp-server/` gets its own `package-lock.json`. CI runs `npm ci --prefix mcp-server` and `npm test --prefix mcp-server`.
- Update the MCP README and CLAUDE.md with the one-time `npm ci --prefix mcp-server`. MCP still imports `../../util/valetudo_http_security.js` by relative path, which works outside a workspace. The MCP client configuration on the Mac keeps the same `node mcp-server/index.js` path.

**`backend/package.json`.** Remove the `./lib/res/valetudo.openapi.schema.json` pkg asset. Upstream never listed it. `WebServer.loadApiSpec()` reads it with `fs.readFileSync(path.join(__dirname, ...))`, a pattern pkg detects and bundles automatically.

**Lockfile.** Rebuild the root lockfile from upstream's, using the `798604ca` method. The only addition should then be the `tar-stream` 3 tree.

**Lines removed:** about 310 from the lockfile and 4 from upstream package files.

**Risk.** Low. The production dependency tree should not change at all. The schema line is the only uncertain item. If pkg did not pick the schema up, the binary would start without payload validation and log a warning.

**Verify.**

- `npm ls express @types/express` shows a single copy of each.
- `npm ls --omit=dev --all --workspace=backend` is identical before and after.
- `npm ci --prefix mcp-server` and its tests pass, and the MCP client starts on the Mac.
- `build_aarch64` prints no pkg warnings. The arm64 container run logs no `Failed to load OpenApi spec`, and `/swagger/` loads. If either check fails, keep the asset line and drop that item from the PR.
- On the robot after the deploy: the same log check.

### PR 5: build-metadata script back to upstream (parent only)

Restore upstream's `util/generate_build_metadata.js` and delete `backend/test/util/GenerateBuildMetadata_test.js`.

The fork's rewrite (`4702b019`) fixed commit IDs for feature-branch and worktree builds. Deploy builds never use either: `tools/build_valetudo.sh` builds from a clean detached clone, where upstream's `.git/HEAD` read returns the SHA. The script also stops if `build_metadata.json` doesn't name the requested commit, so a regression can't reach the robot.

**Lines removed:** 63 −19 from an upstream file and 66 from tests.

**Risk.** Low. CI and local feature-branch builds will show `ref: refs/heads/...` or `unknown` again.

**Verify.** `tools/build_valetudo.sh <commit>` passes its metadata check. After the deploy, the robot's `/api/v2/valetudo/version` reports the commit.

### PR 6 (optional, owner's decision): obsolete safety nets (parent only)

- **Drop the `/runtime/info` env redaction** (`4656a38e`): `SystemRouter.js` and its test, 23 −1 plus 52 lines. Nothing on the robot matches today (finding 2). Basic Auth is on, and the route is admin-only. The 2026-10-03 report drafts already judged it a design choice, not a bug. What would be lost: if a secret-shaped variable is ever added to the robot's environment, an authenticated admin could read it.
- **Move the Quirks paragraph** from `docs/pages/usage/capabilities-overview.md` into the plugin README. The fork never publishes upstream's docs site.

**Lines removed:** 27 from upstream files and 52 from tests.

**Risk.** None for the docs and CI items. For the redaction, see above.

**Deploy point.** PRs 3–6 change only the build: the bundle hash, the lockfile, metadata, and one admin-only response. They can go out with the next upstream-sync deploy (upstream is already at `209049bb`) or in their own deploy, with the same gates.

## Kept on purpose

- **Plugin hooks** (`core/capabilities/index.js`, `dreame/capabilities/index.js`, `capabilityRouters/index.js`, `CapabilitiesRouter.js`, `HandleMappings.js`, and the L10S robot file). These are the narrow integration surface.
- **Frontend pages, routes, menu items and the `Capability` enum entries.** The TypeScript enum and the UI routing can't be extended from the JavaScript submodule.
- **ForcedGcPolicy** (`Valetudo.js`, `utils/ForcedGcPolicy.js`). It is kept over upstream `40e767de`; see CLAUDE.md "Upstream Synchronization". Draft 1 in the upstream report drafts covers it.
- **The miIO secret and token redaction** (`MiioValetudoRobot.js`, `Codec.js`). Upstream still logs these values, and no hook reaches either file. Drop the redaction only if upstream fixes it (draft 2).
- **Single-flight MQTT refresh** (`MqttController.js`, `SingleFlightRefresh.js`). No hook reaches `MqttController`. Patching its prototype from the plugin would hide a behavior change behind a circular require (`MqttController` → `HandleMappings` → plugin). Its "MQTT auto refresh completed slowly" warning is also what tied the 2026-10-03 slowdown to Wi-Fi roaming (work-list item 8).
- **`joystick.html`, `Quirk.mqttExposed` and the Midea flag.** Kept by PR #35. Finding 1 may change whether they matter.
- **Lazy-loaded routers** (`AppRouter.tsx`, `OptionsRouter.tsx`) and **`frontend/scripts/build.js`**. These are GUI first-load size and the sidecars that PR 2's middleware serves. Dropping the lazy loading would change GUI behavior and would need a measured before-and-after comparison. Later, `build.js`'s additions could move into a fork-only post-build script called from `frontend/package.json` (59 lines out, 1 line in). This is not proposed now.
- **CI submodule checkouts, plugin lint, the backend test glob, and `tar-stream` in `backend/package.json` and at the root.** They are needed while the plugin is a submodule.
- **The CI module-load smoke step** (`nodejs.yml`). No backend or plugin test requires `WebServer.js`, so this step is the only CI check that the whole module graph, plugin included, loads.

Considered and rejected:

- Moving the plugin to `tar-stream` 2.2.0, which upstream already has as a dev dependency, would remove about 222 lockfile lines. It would also put map import and export on an unmaintained major version.

## Appendix: every file

Lines are `git diff --numstat 69c60625 fork/master`. "Commits" are the fork-only commits that touched the file, newest first: `git log --no-merges ^origin/master fork/master -- <file>`. "PRs" are the fork PRs that merged those commits, oldest first. For the hook files the list includes earlier commits whose lines were later rewritten; `git blame` on `fork/master` shows which ones survive.

### Repository root and CI

| File | | Lines | Commits | PRs | Cat. | Note |
|---|---|---|---|---|---|---|
| `.github/copilot-instructions.md` | new | +22 −0 | `ce472c11`, `7117ee6d`, `1beae4c3` | #3, #6 | d | Fork agent guardrails |
| `.github/workflows/manual_build.yml` | mod | +4 −1 | `edef8e62` | #3 | b | Checks out the plugin submodule |
| `.github/workflows/nightly_build.yml` | mod | +2 −1 | `edef8e62` | #3 | b | Checks out the plugin submodule |
| `.github/workflows/nodejs.yml` | mod | +10 −1 | `f5308562`, `92df474c`, `80eda823`, `edef8e62` | #3, #10 | b | Submodule checkout, plugin lint, MCP tests, and the module-load smoke step (the only CI check that loads WebServer.js). The MCP step changes in PR 4 |
| `.github/workflows/release.yml` | mod | +4 −1 | `edef8e62` | #3 | b | Checks out the plugin submodule |
| `.gitmodules` | new | +3 −0 | `4a739c99` | #3 | b | The plugin submodule itself |
| `CLAUDE.md` | new | +479 −0 | `8c483cb6`, `12891dfc`, `e480f24e`, +5 earlier | #23, #24, #25, #26, #27, #28, #31, #37 | d |  |
| `MEMORY.md` | new | +198 −0 | `277efc7c`, `8c483cb6`, `12891dfc`, +5 earlier | #25, #26, #27, #28, #30, #31, #37 | d |  |
| `package-lock.json` | mod | +735 −50 | `798604ca`, `92df474c`, `06001d5a`, +3 earlier | #3, #34 | b | `tar-stream` 3 tree stays (~222 lines). The MCP tree (~306 lines) leaves in PR 4 |
| `package.json` | mod | +10 −2 | `798604ca`, `f5308562`, `41e90ee4`, +4 earlier | #3, #7, #10, #34 | b | `lint_plugin`, root `tar-stream` pin (hoisting). The express pins and the `mcp-server` workspace are c (PR 4); the profiler script is d |
| `vacuumstreamer-plugin` | new | +1 −0 | `498914dc`, `587f3534`, `720b6298`, +5 earlier | #10, #21, #22, #31, #32, #35 | b | Submodule pointer |

### backend/lib

| File | | Lines | Commits | PRs | Cat. | Note |
|---|---|---|---|---|---|---|
| `backend/lib/Valetudo.js` | mod | +14 −27 | `d2b81c8b` | #10 | b | ForcedGcPolicy, kept over upstream `40e767de` |
| `backend/lib/core/Quirk.js` | mod | +2 −0 | `af08ded3` | #6 | b | `mqttExposed`, kept by PR #35 |
| `backend/lib/core/capabilities/index.js` | mod | +3 −0 | `2f038441`, `4a739c99`, `36cda315`, +2 earlier | #3 | b | Plugin hook |
| `backend/lib/doc/Configuration.openapi.json` | mod | +2 −1 | `af08ded3` | #6 | b | Lets the config enable the plugin's optional Quirks MQTT handle (see finding 1) |
| `backend/lib/miio/Codec.js` | mod | +2 −2 | `77efd541` | #10 | b | Stops logging the handshake token; no hook reaches it |
| `backend/lib/mqtt/MqttController.js` | mod | +20 −14 | `6f3f3282` | #7 | b | Single-flight MQTT refresh; no hook reaches MqttController |
| `backend/lib/mqtt/SingleFlightRefresh.js` | new | +62 −0 | `6f3f3282` | #7 | b | Used only by MqttController |
| `backend/lib/mqtt/handles/HandleMappings.js` | mod | +6 −0 | `587f3534`, `ce472c11` | #6, #35 | b | Plugin hook |
| `backend/lib/res/env.js` | mod | +1 −0 | `6f3f3282` | #7 | a | PR 2: the plugin reads `VALETUDO_SLOW_REQUEST_MS` itself |
| `backend/lib/robots/MiioValetudoRobot.js` | mod | +5 −2 | `798604ca`, `77efd541`, `fb4ba57f` | #3, #10, #34 | b | Stops logging the miIO secrets; no hook reaches it |
| `backend/lib/robots/dreame/DreameL10SProUltraHeatValetudoRobot.js` | mod | +2 −0 | `587f3534`, `b29d8e8f`, `2f038441`, +5 earlier | #3, #21, #35 | b | Plugin hook |
| `backend/lib/robots/dreame/DreameQuirkFactory.js` | mod | +3 −0 | `a568be39` | #3 | a | PR 1: `ExtrFreq` guard moves into `RobotOverrides.js` |
| `backend/lib/robots/dreame/capabilities/index.js` | mod | +3 −0 | `2f038441`, `4a739c99`, `36cda315`, +2 earlier | #3 | b | Plugin hook |
| `backend/lib/robots/midea/MideaQuirkFactory.js` | mod | +1 −0 | `af08ded3` | #6 | b | `mqttExposed: false` on the cliff-sensor quirk, kept by PR #35 |
| `backend/lib/utils/ForcedGcPolicy.js` | new | +67 −0 | `d2b81c8b` | #10 | b | ForcedGcPolicy |
| `backend/lib/webserver/CapabilitiesRouter.js` | mod | +3 −0 | `2f038441`, `4a739c99`, `36cda315`, +2 earlier | #3 | b | Plugin hook |
| `backend/lib/webserver/SystemRouter.js` | mod | +23 −1 | `4656a38e` | #10 | c | PR 6, optional: `/runtime/info` env redaction; no key on the robot matches today (finding 2) |
| `backend/lib/webserver/WebServer.js` | mod | +26 −1 | `fcf28bf5`, `1140afec`, `6f3f3282`, `82209d33` | #7 | a | PR 2: becomes two plugin hook calls (+4) instead of +26 −1 |
| `backend/lib/webserver/capabilityRouters/VoicePackManagementCapabilityRouter.js` | mod | +43 −0 | `d79e2de6` | #29 | a | PR 1: plugin overrides the router mapping with a guarded subclass |
| `backend/lib/webserver/capabilityRouters/index.js` | mod | +3 −0 | `2f038441`, `4a739c99`, `36cda315`, +2 earlier | #3 | b | Plugin hook |
| `backend/lib/webserver/middlewares/PrecompressedStaticMiddleware.js` | new | +143 −0 | `e993e00f`, `1140afec`, `989be1c0`, `82209d33` | #7, #8 | a | PR 2 |
| `backend/lib/webserver/middlewares/SlowRequestMiddleware.js` | new | +122 −0 | `12891dfc`, `6f3f3282` | #7, #31 | a | PR 2 (already coupled to the plugin's `res.locals.longLivedStream`) |
| `backend/lib/webserver/middlewares/index.js` | mod | +2 −0 | `6f3f3282`, `82209d33` | #7 | a | PR 2: returns to upstream |

### backend/package.json and backend tests

| File | | Lines | Commits | PRs | Cat. | Note |
|---|---|---|---|---|---|---|
| `backend/package.json` | mod | +3 −1 | `798604ca`, `15f596b8`, `06001d5a`, +3 earlier | #3, #34 | b | Test glob for plugin and frontend tests, `tar-stream`. The OpenAPI pkg asset line is c (PR 4) |
| `backend/test/lib/miio/Codec_test.js` | new | +76 −0 | `77efd541` | #10 | b | Tests the secret-logging fix |
| `backend/test/lib/mqtt/SingleFlightRefresh_test.js` | new | +107 −0 | `6f3f3282` | #7 | b |  |
| `backend/test/lib/robots/MiioValetudoRobot_test.js` | new | +34 −0 | `77efd541` | #10 | b | Tests the secret-logging fix |
| `backend/test/lib/utils/ForcedGcPolicy_test.js` | new | +87 −0 | `d2b81c8b` | #10 | b |  |
| `backend/test/lib/webserver/PrecompressedStaticMiddleware_test.js` | new | +107 −0 | `e993e00f`, `1140afec`, `989be1c0`, `82209d33` | #7, #8 | a | PR 2: moves to the plugin's `test/` |
| `backend/test/lib/webserver/SlowRequestMiddleware_test.js` | new | +128 −0 | `12891dfc`, `6f3f3282` | #7, #31 | a | PR 2: moves to the plugin's `test/` |
| `backend/test/lib/webserver/SystemRouter_test.js` | new | +52 −0 | `4656a38e` | #10 | c | PR 6, with SystemRouter |
| `backend/test/lib/webserver/VoicePackManagementCapabilityRouter_test.js` | new | +59 −0 | `d79e2de6` | #29 | a | PR 1: moves to the plugin's `test/` |
| `backend/test/util/GenerateBuildMetadata_test.js` | new | +66 −0 | `4702b019` | #10 | c | PR 5, with the build-metadata rewrite |
| `backend/test/util/VacuumResourceProfiler_test.js` | new | +279 −0 | `9343daed`, `07784ad4`, `2d86f253`, +2 earlier | #7, #9, #24 | d | Profiler |
| `backend/test/util/ValetudoHttpSecurity_test.js` | new | +36 −0 | `9343daed` | #24 | d | Profiler/MCP transport rules |
| `backend/test/util/ValetudoHttps_test.js` | new | +66 −0 | `723caea5`, `e388147c`, `9343daed` | #24, #32 | d | Profiler/MCP transport rules |

### frontend

| File | | Lines | Commits | PRs | Cat. | Note |
|---|---|---|---|---|---|---|
| `frontend/public/joystick.html` | new | +403 −0 | `15f596b8`, `4cbea000` | #3 | b | Kept by PR #35; upstream never touches the file |
| `frontend/scripts/build.js` | mod | +59 −0 | `82209d33` | #7 | b | Brotli/gzip sidecars and bundle budgets; frontend build tooling cannot live in the plugin |
| `frontend/src/App.tsx` | mod | +7 −2 | `82209d33` | #7 | c | PR 3: TanStack already makes the devtools a no-op in production builds; confirm with a build |
| `frontend/src/AppRouter.tsx` | mod | +14 −10 | `82209d33` | #7 | b | Lazy-loaded routers (GUI first-load size); frontend |
| `frontend/src/api/VacuumstreamerApiClient.ts` | new | +59 −0 | `12891dfc`, `36cda315` | #3, #31 | b | Frontend side file |
| `frontend/src/api/VacuumstreamerApiHooks.ts` | new | +110 −0 | `12891dfc`, `36cda315` | #3, #31 | b | Frontend side file |
| `frontend/src/api/index.ts` | mod | +2 −0 | `36cda315` | #3 | b | Frontend hook |
| `frontend/src/api/types.ts` | mod | +28 −0 | `12891dfc`, `c437bcd2` | #3, #31 | b | The two enum entries stay. The 26 lines of interfaces are a′ (PR 3: move to a side file) |
| `frontend/src/components/VacuumstreamerMenuItems.ts` | new | +27 −0 | `12891dfc`, `36cda315` | #3, #31 | b | Frontend side file |
| `frontend/src/components/ValetudoAppBar.tsx` | mod | +2 −0 | `36cda315`, `c437bcd2` | #3 | b | Frontend hook |
| `frontend/src/options/OptionsRouter.tsx` | mod | +2 −1 | `82209d33` | #7 | b | Lazy-loaded router; frontend |
| `frontend/src/robot/RobotRouter.tsx` | mod | +2 −0 | `36cda315`, `c437bcd2` | #3 | b | Frontend hook |
| `frontend/src/robot/VacuumstreamerRoutes.tsx` | new | +12 −0 | `12891dfc`, `82209d33`, `36cda315` | #3, #7, #31 | b | Frontend side file |
| `frontend/src/robot/capabilities/MapManagementCapability.tsx` | new | +420 −0 | `c437bcd2` | #3 | b | Floor-management page |
| `frontend/src/robot/capabilities/VideoStreamCapability.tsx` | new | +189 −0 | `abce18e6`, `12891dfc` | #31, #36 | b | Camera page |
| `frontend/test/JoystickPage_test.js` | new | +192 −0 | `2b1011eb`, `15f596b8` | #3 | b | Tests joystick.html |

### util

| File | | Lines | Commits | PRs | Cat. | Note |
|---|---|---|---|---|---|---|
| `util/generate_build_metadata.js` | mod | +44 −19 | `4702b019` | #10 | c | PR 5: returns to upstream |
| `util/profile_vacuum_resources.js` | new | +50 −0 | `9343daed`, `07784ad4`, `41e90ee4` | #7, #9, #24 | d | Profiler |
| `util/vacuum_resource_profiler.js` | new | +634 −0 | `9343daed`, `07784ad4`, `2d86f253`, +2 earlier | #7, #9, #24 | d | Profiler |
| `util/valetudo_http_security.js` | new | +71 −0 | `9343daed` | #24 | d | Shared by the profiler and MCP |

### docs

| File | | Lines | Commits | PRs | Cat. | Note |
|---|---|---|---|---|---|---|
| `docs/maintenance/2026-09-17-home-assistant-bridge.md` | new | +92 −0 | `2786c68d`, `1abb8a3f`, `2f0d2bcc`, +5 earlier | #21, #22, #23, #25 | d |  |
| `docs/maintenance/2026-09-26-next-session-handoff.md` | new | +37 −0 | `2786c68d`, `1abb8a3f` | #23, #25 | d |  |
| `docs/maintenance/2026-09-28-next-session-handoff.md` | new | +74 −0 | `e480f24e`, `1d977656`, `21cec3a5`, `2786c68d` | #25, #26, #27, #28 | d |  |
| `docs/maintenance/2026-10-03-upstream-report-drafts.md` | new | +65 −0 | `89449a5c` | #30 | d |  |
| `docs/pages/usage/capabilities-overview.md` | mod | +4 −0 | `af08ded3` | #6 | c | PR 6, optional: the paragraph moves to the plugin README; the fork never publishes upstream's docs site |

### mcp-server

| File | | Lines | Commits | PRs | Cat. | Note |
|---|---|---|---|---|---|---|
| `mcp-server/.gitignore` | new | +2 −0 | `354ef6db` | #3 | d |  |
| `mcp-server/README.md` | new | +159 −0 | `9343daed`, `2f0d2bcc`, `92df474c`, `354ef6db` | #3, #22, #24 | d |  |
| `mcp-server/index.js` | new | +60 −0 | `9343daed`, `92df474c`, `354ef6db` | #3, #24 | d |  |
| `mcp-server/lib/config.js` | new | +44 −0 | `9343daed`, `92df474c` | #3, #24 | d |  |
| `mcp-server/lib/plugin-loader.js` | new | +62 −0 | `354ef6db` | #3 | d |  |
| `mcp-server/lib/valetudo-client.js` | new | +174 −0 | `9343daed`, `b8e5cdd9`, `92df474c`, `354ef6db` | #3, #10, #24 | d |  |
| `mcp-server/package.json` | new | +25 −0 | `92df474c`, `354ef6db` | #3 | d | PR 4: gets its own `package-lock.json` and leaves the root workspaces |
| `mcp-server/plugins/_example.js` | new | +62 −0 | `354ef6db` | #3 | d |  |
| `mcp-server/plugins/consumables.js` | new | +91 −0 | `354ef6db` | #3 | d |  |
| `mcp-server/plugins/feature-controls.js` | new | +174 −0 | `354ef6db` | #3 | d |  |
| `mcp-server/plugins/quirks.js` | new | +36 −0 | `354ef6db` | #3 | d |  |
| `mcp-server/plugins/tts.js` | new | +66 −0 | `354ef6db` | #3 | d |  |
| `mcp-server/plugins/vacuum-control.js` | new | +113 −0 | `354ef6db` | #3 | d |  |
| `mcp-server/plugins/video-stream.js` | new | +59 −0 | `92df474c`, `354ef6db` | #3 | d |  |
| `mcp-server/test/config_test.js` | new | +41 −0 | `9343daed`, `92df474c` | #3, #24 | d |  |
| `mcp-server/test/stdio-integration_test.js` | new | +66 −0 | `9343daed`, `92df474c` | #3, #24 | d |  |
| `mcp-server/test/valetudo-client_test.js` | new | +141 −0 | `9343daed`, `b8e5cdd9`, `92df474c` | #3, #10, #24 | d |  |
