const childProcess = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

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

    for (const key of ["duration", "interval", "timeout"]) {
        const value = Number(options[key]);
        if (!Number.isFinite(value) || value <= 0) {
            throw new Error(`--${toKebabCase(key)} must be a positive number`);
        }
        options[key] = value;
    }
    if (options.interval > options.duration) {
        throw new Error("--interval cannot be greater than --duration");
    }
    options.httpBase = validateHttpBase(options.httpBase);
    options.label = sanitizeLabel(options.label);
    options.output = path.resolve(options.output);

    return options;
}

function toCamelCase(value) {
    return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function toKebabCase(value) {
    return value.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
}

function validateHttpBase(value) {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" || parsed.username || parsed.password || parsed.search || parsed.hash) {
        throw new Error("--http-base must be an HTTP URL without credentials, a query, or a fragment");
    }
    return parsed.toString().replace(/\/$/, "");
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
    return new Promise(resolve => {
        const started = process.hrtime.bigint();
        const child = childProcess.spawn("ssh", [
            "-o", "BatchMode=yes",
            "-o", `ConnectTimeout=${Math.max(1, Math.ceil(timeout / 1000))}`,
            host,
            REMOTE_SAMPLE_COMMAND
        ], {stdio: ["ignore", "pipe", "pipe"]});
        const stdout = [];
        let settled = false;
        const timer = setTimeout(() => {
            child.kill("SIGTERM");
            finish({error: "SSH sample timed out", ok: false});
        }, timeout);

        child.stdout.on("data", chunk => stdout.push(chunk));
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
            resolve(result);
        }
    });
}

function measureHttp(url, timeout, captureBody = false, acceptEncoding = "identity") {
    return new Promise(resolve => {
        const started = process.hrtime.bigint();
        let firstByteMs = null;
        let bytes = 0;
        const request = http.get(url, {headers: {"Accept-Encoding": acceptEncoding, "User-Agent": "ValetudoResourceProfiler/1"}}, response => {
            const chunks = [];
            response.once("data", () => {
                firstByteMs = elapsedMs(started);
            });
            response.on("data", chunk => {
                bytes += chunk.length;
                if (captureBody && bytes <= 2 * 1024 * 1024) {
                    chunks.push(chunk);
                }
            });
            response.on("end", () => resolve({
                body: captureBody ? Buffer.concat(chunks).toString("utf8") : undefined,
                bytes,
                contentEncoding: response.headers["content-encoding"] || "identity",
                durationMs: elapsedMs(started),
                firstByteMs: firstByteMs ?? elapsedMs(started),
                ok: response.statusCode >= 200 && response.statusCode < 400,
                status: response.statusCode
            }));
        });
        request.setTimeout(timeout, () => request.destroy(new Error("HTTP request timed out")));
        request.on("error", error => resolve({durationMs: elapsedMs(started), error: safeError(error), ok: false}));
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
    const matches = [...String(html).matchAll(/<script[^>]+src=["']([^"']+\.js)["']/gi)];
    const preferred = matches.find(match => /\/static\/js\/main\.[a-f0-9]+\.js$/i.test(match[1])) || matches.at(-1);
    return preferred ? new URL(preferred[1], `${base}/`).toString() : null;
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
    const string = String(value);
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
    const ssh = dependencies.executeSsh || executeSsh;
    const httpMeasure = dependencies.measureHttp || measureHttp;
    const sleep = dependencies.sleep || (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)));
    const sampleCount = Math.max(1, Math.floor(options.duration / options.interval));
    const samples = [];
    let previous;
    let javascriptUrl = null;
    const initialIndex = await httpMeasure(`${options.httpBase}/`, options.timeout, true);
    if (initialIndex.ok) {
        javascriptUrl = discoverMainScript(initialIndex.body, options.httpBase);
    }

    for (let index = 0; index < sampleCount; index++) {
        const sampleStarted = Date.now();
        const extended = index % Math.max(1, Math.round(30 / options.interval)) === 0;
        const requests = [
            ssh(options.sshHost, options.timeout),
            httpMeasure(`${options.httpBase}/`, options.timeout),
            httpMeasure(`${options.httpBase}/api/v2/robot/state/attributes`, options.timeout, true),
            httpMeasure(`${options.httpBase}/api/v2/robot/capabilities/VideoStreamCapability`, options.timeout, true)
        ];
        if (extended) {
            requests.push(httpMeasure(`${options.httpBase}/api/v2/robot/state/map`, options.timeout));
            if (javascriptUrl) {
                requests.push(httpMeasure(javascriptUrl, options.timeout, false, "br, gzip"));
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
            label: options.label,
            robot: extractRobotState(stateResult.body),
            system,
            timestamp: new Date().toISOString(),
            videoActive: extractVideoState(videoResult.body)
        });

        const remaining = options.interval * 1000 - (Date.now() - sampleStarted);
        if (index + 1 < sampleCount && remaining > 0) {
            await sleep(remaining);
        }
    }
    return {javascriptUrl, samples, summary: summarize(samples)};
}

function writeResults(options, result) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const directory = path.join(options.output, `${timestamp}_${options.label}`);
    fs.mkdirSync(directory, {recursive: true, mode: 0o700});
    const metadata = {
        completedAt: new Date().toISOString(),
        durationSeconds: options.duration,
        httpBase: options.httpBase,
        intervalSeconds: options.interval,
        javascriptUrl: result.javascriptUrl,
        label: options.label,
        sshHost: options.sshHost
    };
    fs.writeFileSync(path.join(directory, "metadata.json"), JSON.stringify(metadata, null, 2) + "\n", {mode: 0o600});
    fs.writeFileSync(path.join(directory, "samples.csv"), samplesToCsv(result.samples), {mode: 0o600});
    fs.writeFileSync(path.join(directory, "summary.json"), JSON.stringify(result.summary, null, 2) + "\n", {mode: 0o600});
    return directory;
}

module.exports = {
    DEFAULTS,
    PROCESS_NAMES,
    discoverMainScript,
    extractRobotState,
    parseArguments,
    parseProcStat,
    parseRemoteSample,
    percentile,
    runProfile,
    samplesToCsv,
    summarize,
    validateHttpBase,
    writeResults
};
