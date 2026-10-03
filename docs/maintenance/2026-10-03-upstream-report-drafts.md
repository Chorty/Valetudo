# Upstream report drafts — 2026-10-03

Work-list item 11 was to offer four fork fixes to `Hypfer/Valetudo`. The owner chose drafts only, to review and submit personally.

**Do not open pull requests upstream.** `.github/PULL_REQUEST_TEMPLATE.md` on `origin/master` (`31bbc50c`) says the maintainer does not take pull requests, and that anyone who opens one regardless will be banned. `CONTRIBUTING.md` says the same at greater length. The constructive route is a bug report through the upstream issue form, which leaves the fix to the maintainer. The form asks you to file only when sure the behaviour is a bug in Valetudo itself. This robot runs a fork with a plugin, so confirm each report on an official release first.

## Reference branches (local only, not pushed)

Each fix is rebased onto upstream `master` `31bbc50c` as its own branch in this repository. They exist as evidence and as a reference for the reports; they are not for submission.

| Branch | From fork commit | Applies | Upstream backend tests |
|---|---|---|---|
| `upstream/forced-gc-reclaimable` | `d2b81c8b` | Ported by hand onto the code-RSS estimate | 103 pass |
| `upstream/miio-secret-logging` | `77efd541` | Clean cherry-pick | 101 pass |
| `upstream/build-commit-id` | `4702b019` | Clean cherry-pick | 102 pass |
| `upstream/runtime-env-redaction` | `4656a38e` | Clean cherry-pick | 100 pass |

Upstream `master` itself has the same 2 `tsc` errors in this checkout: a missing generated Midea protobuf module, and `ConsumableMonitoringCapabilityRouter.js`. None of the branches adds any.

## Recommendation

| Fix | File? | Why |
|---|---|---|
| Forced GC loop | **Yes, after confirming on an official release** | A bug in unmodified upstream code, with a clear mechanism and measured CPU impact |
| miIO secrets and handshake token in the log | **Yes** | Secrets in a log users routinely paste into support threads |
| Build commit id | No | Affects only builds from a detached or feature checkout, which is this fork's workflow, not upstream's |
| `/runtime/info` env redaction | No | Only reachable by an authenticated admin, and a design choice upstream may reasonably make differently |

## Draft 1 — forced GC can loop when executable pages become resident after startup

Confirm on an official upstream release first. Record `RssFile` in `/proc/$(pidof valetudo)/status` shortly after start and again after a day docked, and Valetudo's CPU in `top` at both points.

**What is happening?**
On a Dreame L10S Pro Ultra Heat, Valetudo's CPU use while docked rose from about 4% after boot to 36–49% after about two days. Over that time Valetudo forced a full garbage collection every 2.5 s. The process's `RssFile`, the file-backed pages of the executable, keeps growing for hours after start: about 21 MiB at 3 hours and 22 MiB at 6.4 hours, against roughly 56–66 MiB anonymous. A garbage collection cannot release file-backed pages. `setupMemoryManagement()` estimates code RSS once after startup. Any later growth in resident executable pages is therefore counted as reclaimable memory, so `rss - codeRssEstimate` can sit above `heap_size_limit + 5 MiB` indefinitely. The 2.5 s rate limit then becomes a fixed loop with no backoff.

**What should be happening?**
A forced collection should happen only when memory a collection can reclaim (`heapUsed + external`) exceeds the limit. A forced collection that does not bring usage back under the threshold should not be repeated every 2.5 s indefinitely.

**How to reproduce**
1. Run Valetudo on an L10S, or another aarch64 robot whose binary pages in slowly.
2. Leave it docked and idle for several hours to a day.
3. Compare `RssFile` and Valetudo's CPU against the values just after start. CPU rises while heap and buffers stay flat.

**Valetudo version:** fill in the official release used for confirmation.
**Robot:** Dreame L10S Pro Ultra Heat (`r9302`).
**Firmware:** 1574.

**Additional context**
The measurements above came from a build that leaves `setupMemoryManagement()` unchanged. The 36–49% CPU figure predates the code-RSS estimate. The estimate narrows the problem, but if `RssFile` still grows after the estimate is taken, the trigger can still re-arm. Basing the trigger on `heapUsed + external`, and doubling the wait after an ineffective collection (up to 60 s), held Valetudo at about 2.5% CPU after 15.8 hours on this robot. That approach is in `upstream/forced-gc-reclaimable` for reference.

## Draft 2 — miIO cloud and local secrets and the handshake token appear in the log

**What is happening?**
At startup, `MiioValetudoRobot` logs the device information including the cloud secret and the local secret. `miio/Codec.js` logs `Got token from handshake:` with the token in hex. Both appear in Valetudo's normal info-level log, which users are routinely asked to paste into support requests.

**What should be happening?**
The log should identify the device without printing the cloud or local secret or the handshake token, for example by printing that a token was received, or a short non-reversible fingerprint.

**How to reproduce**
Start Valetudo on any miIO-based robot and read the log from the Log page, or `/tmp/valetudo.log` on the robot.

**Valetudo version, robot, firmware:** as in draft 1, from the official release used to confirm.

**Additional context**
`upstream/miio-secret-logging` shows a minimal change: two log statements adjusted, plus tests asserting the values no longer appear.
