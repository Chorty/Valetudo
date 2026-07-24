const childProcess = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const CAPTURE_BODY_LIMIT_BYTES = 2 * 1024 * 1024;
const HTTP_RESPONSE_LIMIT_BYTES = 4 * 1024 * 1024;
const MAX_SAMPLE_COUNT = 10000;
const SSH_OUTPUT_LIMIT_BYTES = 1024 * 1024;
const PROCESS_NAMES = ["ava", "valetudo", "video_monitor", "go2rtc", "maploader", "dmr_player"];
const DEFAULTS = Object.freeze({
    duration: 600,
    httpBase: "http://192.168.1.31",
    interval: 5,
    label: "profile",
    output: path.join(process.env.HOME || process.cwd(), "Documents", "ValetudoProfiles"),
    sshHost: "vacuum",
    timeout: 10000
});

// This command deliberately reads only aggregate counters and fixed process names. It never reads argv or environment data.
const REMOTE_SAMPLE_COMMAND = String.raw`sh -c '
printf "LOAD\t"; cat /proc/loadavg
printf "CPU\t"; sed -n "1p" /proc/stat
awk "/^cpu[0-9]+ / {count++} END {print \"CPU_COUNT\\t\" count}" /proc/stat
awk "/MemAvailable:/ {print \"MEM_AVAILABLE\\t\" \$2}" /proc/meminfo
if [ -r /proc/net/wireless ]; then
  awk "NR > 2 {gsub(/\\./, \"\", \$4); print \"WIFI_RSSI\\t\" \$4; exit}" /proc/net/wireless
else
  iw dev wlan0 link 2>/dev/null | awk "/signal:/ {print \"WIFI_RSSI\\t\" \$2; exit}"
fi
for procdir in /proc/[0-9]*; do
  [ -r "$procdir/comm" ] || continue
  read comm < "$procdir/comm"
  logical=""
  case "$comm" in
    AVA|ava) logical="ava" ;;
    valetudo) logical="valetudo" ;;
    video_monitor) logical="video_monitor" ;;
    go2rtc) logical="go2rtc" ;;
    maploader) logical="maploader" ;;
    dmr_player) logical="dmr_player" ;;
  esac
  [ -n "$logical" ] || continue
  pid=$(basename "$procdir")
  stat=$(cat "$procdir/stat" 2>/dev/null) || continue
  rss=$(awk "/VmRSS:/ {print \$2}" "$procdir/status" 2>/dev/null)
  threads=$(awk "/Threads:/ {print \$2}" "$procdir/status" 2>/dev/null)
  printf "PROC\t%s\t%s\t%s\t%s\t%s\n" "$logical" "$pid" "$rss" "$threads" "$stat"
done
'`;

function parseArguments(argv) {
    const options = {...DEFAULTS};
    const names = new Set(["duration", "http-base", "interval", "label", "output", "ssh-host", "timeout"]);

    for (let i = 0; i < argv.length; i++) {
        const argument = argv[i];
        if (argument === "--help") {
            options.help = true;
            continue;
        }
        if (!argument.startsWith("--")) {
            throw new Error(`Unexpected argument: ${argument}`);
        }

        const [rawName, inlineValue] = argument.slice(2).split("=", 2);
        if (!names.has(rawName)) {
            throw new Error(`Unknown option: --${rawName}`);
        }
        const value = inlineValue ?? argv[++i];
        if (value === undefined || value.startsWith("--")) {
            throw new Error(`Missing value for --${rawName}`);
        }
        options[toCamelCase(rawName)] = value;
    }

    options.duration = parseBoundedInteger("duration", options.duration, 5, 86400);
    options.interval = parseBoundedInteger("interval", options.interval, 1, 3600);
    options.timeout = parseBoundedInteger("timeout", options.timeout, 100, 120000);
    validateSchedule(options);
    options.httpBase = validateHttpBase(options.httpBase);
    options.label = sanitizeLabel(options.label);
    options.output = path.resolve(options.output);
    options.sshHost = validateSshHost(options.sshHost);

    return options;
}

function parseBoundedInteger(name, value, minimum, maximum) {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
        throw new Error(`--${toKebabCase(name)} must be an integer from ${minimum} through ${maximum}`);
    }
    return parsed;
}

function validateSchedule(options) {
    if (options.interval > options.duration) {
        throw new Error("--interval cannot be greater than --duration");
    }
    const sampleCount = Math.max(1, Math.floor(options.duration / options.interval));
    if (sampleCount > MAX_SAMPLE_COUNT) {
        throw new Error(`Profile schedule exceeds the ${MAX_SAMPLE_COUNT}-sample limit`);
    }
    return sampleCount;
}

function toCamelCase(value) {
    return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function toKebabCase(value) {
    return value.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
}

function validateHttpBase(value) {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") {
        throw new Error("--http-base must be an HTTP origin without credentials, a path, a query, or a fragment");
    }
    return parsed.origin;
}

function validateSshHost(value) {
    const host = String(value);
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$/.test(host)) {
        throw new Error("--ssh-host must be an SSH config host or IP address without options or whitespace");
    }
    return host;
}

function sanitizeLabel(value) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(value)) {
        throw new Error("--label must contain only letters, numbers, dot, underscore, or dash (maximum 64 characters)");
    }
    return value;
}

function parseRemoteSample(output, previous) {
    const parsed = {
        load: {},
        memory: {},
        processes: {},
        systemCpu: {},
        wifi: {}
    };
    let cpuCount = previous?.cpuCount || 1;
    let cpuTicks;

    for (const line of output.split("\n")) {
        const fields = line.split("\t");
        switch (fields[0]) {
            case "LOAD": {
                const values = (fields[1] || "").trim().split(/\s+/).map(Number);
                [parsed.load.one, parsed.load.five, parsed.load.fifteen] = values;
                break;
            }
            case "CPU": {
                const values = (fields[1] || "").trim().replace(/^cpu\s+/, "").split(/\s+/).map(Number);
                cpuTicks = values;
                parsed.systemCpu = calculateCpu(values, previous?.cpuTicks);
                break;
            }
            case "CPU_COUNT":
                cpuCount = numberOrNull(fields[1]) || 1;
                break;
            case "MEM_AVAILABLE":
                parsed.memory.availableKb = numberOrNull(fields[1]);
                break;
            case "WIFI_RSSI":
                parsed.wifi.rssiDbm = numberOrNull(fields[1]);
                break;
            case "PROC": {
                const name = fields[1];
                if (!PROCESS_NAMES.includes(name)) {
                    break;
                }
                const stat = parseProcStat(fields.slice(5).join("\t"));
                const processTicks = stat ? stat.userTicks + stat.systemTicks : null;
                const previousProcess = previous?.processes?.[name];
                const totalDelta = sum(cpuTicks) - sum(previous?.cpuTicks);
                const processDelta = processTicks - previousProcess?.ticks;
                parsed.processes[name] = {
                    cpuPercent: Number.isFinite(processDelta) && totalDelta > 0 ? (processDelta / totalDelta) * 100 * cpuCount : null,
                    nice: stat?.nice ?? null,
                    pid: numberOrNull(fields[2]),
                    rssKb: numberOrNull(fields[3]),
                    threads: numberOrNull(fields[4]),
                    ticks: processTicks
                };
                break;
            }
        }
    }

    return {parsed, rawState: {cpuCount, cpuTicks, processes: parsed.processes}};
}

function parseProcStat(value) {
    const match = /^(\d+) \((.*)\) (.+)$/.exec(value.trim());
    if (!match) {
        return null;
    }
    const fields = match[3].split(/\s+/);
    return {
        nice: numberOrNull(fields[16]),
        systemTicks: numberOrNull(fields[12]),
        userTicks: numberOrNull(fields[11])
    };
}

function calculateCpu(current, previous) {
    if (!current || !previous || current.length < 5 || previous.length < 5) {
        return {busyPercent: null, idlePercent: null};
    }
    const totalDelta = sum(current) - sum(previous);
    const idleDelta = (current[3] + (current[4] || 0)) - (previous[3] + (previous[4] || 0));
    return totalDelta > 0 ? {
        busyPercent: ((totalDelta - idleDelta) / totalDelta) * 100,
        idlePercent: (idleDelta / totalDelta) * 100
    } : {busyPercent: null, idlePercent: null};
}

function sum(values) {
    return Array.isArray(values) ? values.reduce((total, value) => total + (Number(value) || 0), 0) : NaN;
}

function numberOrNull(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function executeSsh(host, timeout) {
    const validatedHost = validateSshHost(host);
    return new Promise(resolve => {
        const started = process.hrtime.bigint();
        const child = childProcess.spawn("ssh", [
            "-o", "BatchMode=yes",
            "-o", `ConnectTimeout=${Math.max(1, Math.ceil(timeout / 1000))}`,
            "--",
            validatedHost,
            REMOTE_SAMPLE_COMMAND
        ], {stdio: ["ignore", "pipe", "ignore"]});
        const stdout = [];
        let stdoutBytes = 0;
        let settled = false;
        const timer = setTimeout(() => {
            child.kill("SIGTERM");
            finish({error: "SSH sample timed out", ok: false});
        }, timeout);

        child.stdout.on("data", chunk => {
            if (settled) {
                return;
            }
            stdoutBytes += chunk.length;
            if (stdoutBytes > SSH_OUTPUT_LIMIT_BYTES) {
                child.kill("SIGTERM");
                finish({error: "SSH sample exceeded output limit", ok: false});
                return;
            }
            stdout.push(chunk);
        });
        child.on("error", error => finish({error: safeError(error), ok: false}));
        child.on("close", code => finish(code === 0 ? {
            durationMs: elapsedMs(started),
            ok: true,
            output: Buffer.concat(stdout).toString("utf8")
        } : {error: `SSH sample failed with exit code ${code}`, ok: false}));

        function finish(result) {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timer);
            child.stdout.removeAllListeners("data");
            resolve(result);
        }
    });
}

function measureHttp(url, timeout, captureBody = false, acceptEncoding = "identity") {
    return new Promise(resolve => {
        const started = process.hrtime.bigint();
        let firstByteMs = null;
        let bytes = 0;
        let capturedBytes = 0;
        let response;
        let settled = false;
        let request;
        const timer = setTimeout(() => {
            request?.destroy();
            response?.destroy();
            finish({durationMs: elapsedMs(started), error: "timeout", ok: false});
        }, timeout);

        try {
            request = http.get(url, {headers: {"Accept-Encoding": acceptEncoding, "User-Agent": "ValetudoResourceProfiler/1"}}, incoming => {
                response = incoming;
                const chunks = [];
                response.once("data", () => {
                    firstByteMs = elapsedMs(started);
                });
                response.on("data", chunk => {
                    bytes += chunk.length;
                    if (bytes > HTTP_RESPONSE_LIMIT_BYTES) {
                        request.destroy();
                        response.destroy();
                        finish({durationMs: elapsedMs(started), error: "response_too_large", ok: false});
                        return;
                    }
                    if (captureBody && capturedBytes < CAPTURE_BODY_LIMIT_BYTES) {
                        const remaining = CAPTURE_BODY_LIMIT_BYTES - capturedBytes;
                        const captured = chunk.length <= remaining ? chunk : chunk.subarray(0, remaining);
                        chunks.push(captured);
                        capturedBytes += captured.length;
                    }
                });
                response.once("aborted", () => finish({durationMs: elapsedMs(started), error: "response_aborted", ok: false}));
                response.once("error", error => finish({durationMs: elapsedMs(started), error: safeError(error), ok: false}));
                response.on("end", () => finish({
                    body: captureBody ? Buffer.concat(chunks).toString("utf8") : undefined,
                    bytes,
                    contentEncoding: response.headers["content-encoding"] || "identity",
                    durationMs: elapsedMs(started),
                    firstByteMs: firstByteMs ?? elapsedMs(started),
                    ok: response.statusCode >= 200 && response.statusCode < 400,
                    status: response.statusCode
                }));
            });
            request.once("error", error => finish({durationMs: elapsedMs(started), error: safeError(error), ok: false}));
        } catch (error) {
            finish({durationMs: elapsedMs(started), error: safeError(error), ok: false});
        }

        function finish(result) {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timer);
            resolve(result);
        }
    });
}

function elapsedMs(started) {
    return Number(process.hrtime.bigint() - started) / 1e6;
}

function safeError(error) {
    return error?.code || error?.name || "request_failed";
}

function extractRobotState(body) {
    try {
        const attributes = JSON.parse(body);
        const result = {};
        if (!Array.isArray(attributes)) {
            return result;
        }
        for (const attribute of attributes) {
            const type = String(attribute.__class || attribute.type || attribute.constructor || "").toLowerCase();
            if (type.includes("battery")) {
                result.battery = attribute.level ?? attribute.value ?? null;
            } else if (type.includes("dockstatus")) {
                result.dock = attribute.value ?? attribute.status ?? null;
            } else if (type.includes("status")) {
                result.status = attribute.value ?? attribute.status ?? null;
                result.flag = attribute.flag ?? null;
            }
        }
        return result;
    } catch {
        return {};
    }
}

function extractVideoState(body) {
    try {
        const value = JSON.parse(body);
        return value.active ?? value.running ?? value.status ?? null;
    } catch {
        return null;
    }
}

function discoverMainScript(html, base) {
    const baseUrl = new URL(base);
    const matches = String(html).matchAll(/<script[^>]+src=["']([^"']+\.js)["']/gi);

    for (const match of matches) {
        let candidate;
        try {
            candidate = new URL(match[1], `${baseUrl.origin}/`);
        } catch {
            continue;
        }
        if (
            candidate.origin === baseUrl.origin &&
            !candidate.username &&
            !candidate.password &&
            !candidate.search &&
            !candidate.hash &&
            /^\/static\/js\/main\.[a-f0-9]{8}\.js$/i.test(candidate.pathname)
        ) {
            return candidate.toString();
        }
    }
    return null;
}

function percentile(values, percentage) {
    const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
    if (sorted.length === 0) {
        return null;
    }
    return sorted[Math.min(sorted.length - 1, Math.ceil((percentage / 100) * sorted.length) - 1)];
}

function summarize(samples) {
    const summary = {
        http: {},
        load: {
            peakOne: maximum(samples.map(sample => sample.system?.load?.one))
        },
        memory: {
            minimumAvailableKb: minimum(samples.map(sample => sample.system?.memory?.availableKb))
        },
        processes: {},
        samples: samples.length
    };
    for (const key of ["root", "state", "map", "javascript", "video"]) {
        const measurements = samples.map(sample => sample.http?.[key]).filter(Boolean);
        const durations = measurements.map(value => value.durationMs);
        summary.http[key] = {
            failures: measurements.filter(value => !value.ok).length,
            maximumMs: maximum(durations),
            p50Ms: percentile(durations, 50),
            p95Ms: percentile(durations, 95),
            samples: measurements.length
        };
    }
    for (const name of PROCESS_NAMES) {
        const measurements = samples.map(sample => sample.system?.processes?.[name]).filter(Boolean);
        summary.processes[name] = {
            averageCpuPercent: average(measurements.map(value => value.cpuPercent)),
            maximumCpuPercent: maximum(measurements.map(value => value.cpuPercent)),
            maximumRssKb: maximum(measurements.map(value => value.rssKb)),
            samples: measurements.length
        };
    }
    return summary;
}

function average(values) {
    const finite = values.filter(Number.isFinite);
    return finite.length ? finite.reduce((total, value) => total + value, 0) / finite.length : null;
}

function maximum(values) {
    const finite = values.filter(Number.isFinite);
    return finite.length ? Math.max(...finite) : null;
}

function minimum(values) {
    const finite = values.filter(Number.isFinite);
    return finite.length ? Math.min(...finite) : null;
}

function csvEscape(value) {
    if (value === undefined || value === null) {
        return "";
    }
    let string = String(value);
    if (typeof value === "string" && /^[=+\-@\t\r]/.test(string)) {
        string = `'${string}`;
    }
    return /[",\n]/.test(string) ? `"${string.replace(/"/g, '""')}"` : string;
}

function samplesToCsv(samples) {
    const columns = [
        ["timestamp", sample => sample.timestamp], ["label", sample => sample.label],
        ["robot_status", sample => sample.robot?.status], ["robot_flag", sample => sample.robot?.flag],
        ["battery", sample => sample.robot?.battery], ["dock", sample => sample.robot?.dock],
        ["video_active", sample => sample.videoActive], ["load_1", sample => sample.system?.load?.one],
        ["load_5", sample => sample.system?.load?.five], ["load_15", sample => sample.system?.load?.fifteen],
        ["cpu_busy_percent", sample => sample.system?.systemCpu?.busyPercent],
        ["memory_available_kb", sample => sample.system?.memory?.availableKb],
        ["wifi_rssi_dbm", sample => sample.system?.wifi?.rssiDbm],
        ["root_status", sample => sample.http?.root?.status], ["root_ms", sample => sample.http?.root?.durationMs],
        ["state_status", sample => sample.http?.state?.status], ["state_ms", sample => sample.http?.state?.durationMs]
    ];
    for (const name of PROCESS_NAMES) {
        for (const field of ["pid", "cpuPercent", "rssKb", "threads", "nice"]) {
            columns.push([`${name}_${toKebabCase(field).replace(/-/g, "_")}`, sample => sample.system?.processes?.[name]?.[field]]);
        }
    }
    return [columns.map(column => column[0]).join(","), ...samples.map(sample => columns.map(column => csvEscape(column[1](sample))).join(","))].join("\n") + "\n";
}

async function runProfile(options, dependencies = {}) {
    const profileOptions = {
        duration: parseBoundedInteger("duration", options.duration, 5, 86400),
        httpBase: validateHttpBase(options.httpBase),
        interval: parseBoundedInteger("interval", options.interval, 1, 3600),
        label: sanitizeLabel(options.label),
        sshHost: validateSshHost(options.sshHost),
        timeout: parseBoundedInteger("timeout", options.timeout, 100, 120000)
    };
    const ssh = dependencies.executeSsh || executeSsh;
    const httpMeasure = dependencies.measureHttp || measureHttp;
    const sleep = dependencies.sleep || (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)));
    const sampleCount = validateSchedule(profileOptions);
    const samples = [];
    let previous;
    let javascriptUrl = null;
    const initialIndex = await httpMeasure(`${profileOptions.httpBase}/`, profileOptions.timeout, true);
    if (initialIndex.ok) {
        javascriptUrl = discoverMainScript(initialIndex.body, profileOptions.httpBase);
    }

    for (let index = 0; index < sampleCount; index++) {
        const sampleStarted = Date.now();
        const extended = index % Math.max(1, Math.round(30 / profileOptions.interval)) === 0;
        const requests = [
            ssh(profileOptions.sshHost, profileOptions.timeout),
            httpMeasure(`${profileOptions.httpBase}/`, profileOptions.timeout),
            httpMeasure(`${profileOptions.httpBase}/api/v2/robot/state/attributes`, profileOptions.timeout, true),
            httpMeasure(`${profileOptions.httpBase}/api/v2/robot/capabilities/VideoStreamCapability`, profileOptions.timeout, true)
        ];
        if (extended) {
            requests.push(httpMeasure(`${profileOptions.httpBase}/api/v2/robot/state/map`, profileOptions.timeout));
            if (javascriptUrl) {
                requests.push(httpMeasure(javascriptUrl, profileOptions.timeout, false, "br, gzip"));
            }
        }
        const [sshResult, rootResult, stateResult, videoResult, mapResult, javascriptResult] = await Promise.all(requests);
        let system = {};
        if (sshResult.ok) {
            const parsed = parseRemoteSample(sshResult.output, previous);
            system = parsed.parsed;
            previous = parsed.rawState;
        }
        samples.push({
            http: {javascript: javascriptResult, map: mapResult, root: rootResult, state: stateResult, video: videoResult},
            label: profileOptions.label,
            robot: extractRobotState(stateResult.body),
            system,
            timestamp: new Date().toISOString(),
            videoActive: extractVideoState(videoResult.body)
        });

        const remaining = profileOptions.interval * 1000 - (Date.now() - sampleStarted);
        if (index + 1 < sampleCount && remaining > 0) {
            await sleep(remaining);
        }
    }
    return {javascriptUrl, samples, summary: summarize(samples)};
}

function writeResults(options, result) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    fs.mkdirSync(options.output, {recursive: true, mode: 0o700});
    const directory = fs.mkdtempSync(path.join(options.output, `${timestamp}_${options.label}_`));
    const metadata = {
        completedAt: new Date().toISOString(),
        durationSeconds: options.duration,
        httpBase: options.httpBase,
        intervalSeconds: options.interval,
        javascriptUrl: result.javascriptUrl,
        label: options.label,
        sshHost: options.sshHost
    };
    fs.writeFileSync(path.join(directory, "metadata.json"), JSON.stringify(metadata, null, 2) + "\n", {flag: "wx", mode: 0o600});
    fs.writeFileSync(path.join(directory, "samples.csv"), samplesToCsv(result.samples), {flag: "wx", mode: 0o600});
    fs.writeFileSync(path.join(directory, "summary.json"), JSON.stringify(result.summary, null, 2) + "\n", {flag: "wx", mode: 0o600});
    return directory;
}

module.exports = {
    CAPTURE_BODY_LIMIT_BYTES,
    DEFAULTS,
    HTTP_RESPONSE_LIMIT_BYTES,
    MAX_SAMPLE_COUNT,
    PROCESS_NAMES,
    SSH_OUTPUT_LIMIT_BYTES,
    discoverMainScript,
    executeSsh,
    extractRobotState,
    measureHttp,
    parseArguments,
    parseProcStat,
    parseRemoteSample,
    percentile,
    runProfile,
    samplesToCsv,
    summarize,
    validateHttpBase,
    validateSshHost,
    writeResults
};
