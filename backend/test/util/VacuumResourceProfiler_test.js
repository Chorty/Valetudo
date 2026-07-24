const assert = require("node:assert/strict");
const EventEmitter = require("node:events");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const Profiler = require("../../../util/vacuum_resource_profiler");

test("profiler options reject URLs containing credentials", () => {
    assert.throws(() => Profiler.parseArguments(["--http-base", "http://user:secret@vacuum/"]), /without credentials/);
    assert.throws(() => Profiler.parseArguments(["--http-base", "http://vacuum/not-an-origin"]), /without credentials, a path/);
    assert.throws(() => Profiler.parseArguments(["--duration", "0"]), /integer from 5 through 86400/);
    assert.throws(() => Profiler.parseArguments(["--duration", "86400", "--interval", "1"]), /sample limit/);
    assert.throws(() => Profiler.parseArguments(["--ssh-host", "-oProxyCommand=bad"]), /without options/);
    assert.throws(() => Profiler.parseArguments(["--label", "bad label"]), /label/);
});

test("remote samples calculate system and process CPU without recording command lines", () => {
    const first = [
        "LOAD\t1.00 2.00 3.00 1/100 123",
        "CPU\tcpu 100 0 50 850 0 0 0 0",
        "CPU_COUNT\t4",
        "MEM_AVAILABLE\t456000",
        "WIFI_RSSI\t-51",
        "PROC\tvaletudo\t42\t82000\t10\t42 (valetudo) S 1 2 3 4 5 6 7 8 9 10 20 10 0 0 0 10 10 0"
    ].join("\n");
    const second = first
        .replace("100 0 50 850", "120 0 60 920")
        .replace("20 10 0 0", "25 15 0 0");
    const initial = Profiler.parseRemoteSample(first);
    const sample = Profiler.parseRemoteSample(second, initial.rawState).parsed;

    assert.equal(sample.memory.availableKb, 456000);
    assert.equal(sample.wifi.rssiDbm, -51);
    assert.equal(sample.processes.valetudo.nice, 10);
    assert.equal(sample.processes.valetudo.rssKb, 82000);
    assert.ok(sample.systemCpu.busyPercent > 0);
    assert.ok(sample.processes.valetudo.cpuPercent > 0);
    assert.equal(JSON.stringify(sample).includes("secret"), false);
});

test("profiler extracts selected robot state and discovers the hashed main script", () => {
    const state = Profiler.extractRobotState(JSON.stringify([
        {__class: "BatteryStateAttribute", level: 88},
        {__class: "StatusStateAttribute", value: "docked", flag: "none"},
        {__class: "DockStatusStateAttribute", value: "idle"}
    ]));
    assert.deepEqual(state, {battery: 88, dock: "idle", flag: "none", status: "docked"});
    assert.equal(
        Profiler.discoverMainScript('<script src="./static/js/main.abc12345.js"></script>', "http://vacuum"),
        "http://vacuum/static/js/main.abc12345.js"
    );
    assert.equal(
        Profiler.discoverMainScript('<script src="http://vacuum/static/js/main.1234abcd.js"></script>', "http://vacuum"),
        "http://vacuum/static/js/main.1234abcd.js"
    );
    for (const source of [
        "http://other.test/static/js/main.abc12345.js",
        "//other.test/static/js/main.abc12345.js",
        "http://user:secret@vacuum/static/js/main.abc12345.js",
        "/static/js/main.abc12345.js?query=1",
        "/static/js/main.abc12345.js#fragment",
        "/static/js/main.abc1234.js",
        "/static/js/runtime.abc12345.js"
    ]) {
        assert.equal(Profiler.discoverMainScript(`<script src="${source}"></script>`, "http://vacuum"), null);
    }
});

test("summaries report failures, percentiles, resource peaks, and minimum memory", () => {
    const samples = [100, 200, 900].map((duration, index) => ({
        http: {root: {durationMs: duration, ok: index !== 2}},
        system: {
            load: {one: index + 1},
            memory: {availableKb: 300 - index * 50},
            processes: {valetudo: {cpuPercent: 10 + index, rssKb: 80000 + index * 1000}}
        }
    }));
    const summary = Profiler.summarize(samples);

    assert.equal(summary.http.root.failures, 1);
    assert.equal(summary.http.root.p50Ms, 200);
    assert.equal(summary.http.root.p95Ms, 900);
    assert.equal(summary.load.peakOne, 3);
    assert.equal(summary.memory.minimumAvailableKb, 200);
    assert.equal(summary.processes.valetudo.maximumRssKb, 82000);
});

test("CSV output neutralizes string formulas while preserving numeric values", () => {
    const csv = Profiler.samplesToCsv([{
        label: "@unsafe",
        system: {wifi: {rssiDbm: -51}},
        timestamp: "=NOW()"
    }]);

    assert.match(csv, /'=NOW\(\),'@unsafe/);
    assert.match(csv, /,-51,/);
});

test("HTTP measurement applies an absolute deadline and a response-size limit", async () => {
    const originalGet = http.get;
    try {
        let destroyed = false;
        http.get = () => {
            const request = new EventEmitter();
            request.destroy = () => {
                destroyed = true;
            };
            return request;
        };
        const timeoutResult = await Profiler.measureHttp("http://example.test/", 5);
        assert.equal(timeoutResult.ok, false);
        assert.equal(timeoutResult.error, "timeout");
        assert.equal(destroyed, true);

        http.get = (url, options, callback) => {
            const request = new EventEmitter();
            request.destroy = () => {};
            process.nextTick(() => {
                const response = new EventEmitter();
                response.destroy = () => {};
                response.headers = {};
                response.statusCode = 200;
                callback(response);
                response.emit("data", Buffer.alloc(Profiler.HTTP_RESPONSE_LIMIT_BYTES + 1));
            });
            return request;
        };
        const largeResult = await Profiler.measureHttp("http://example.test/", 1000, true);
        assert.equal(largeResult.ok, false);
        assert.equal(largeResult.error, "response_too_large");
    } finally {
        http.get = originalGet;
    }
});

test("result files use unique private directories and exclusive private files", t => {
    const output = fs.mkdtempSync(path.join(os.tmpdir(), "valetudo-profiler-test-"));
    t.after(() => fs.rmSync(output, {force: true, recursive: true}));
    const options = {
        duration: 5,
        httpBase: "http://vacuum",
        interval: 5,
        label: "test",
        output: output,
        sshHost: "vacuum",
        timeout: 1000
    };
    const result = {javascriptUrl: null, samples: [], summary: {samples: 0}};

    const first = Profiler.writeResults(options, result);
    const second = Profiler.writeResults(options, result);
    assert.notEqual(first, second);
    assert.equal(fs.statSync(first).mode & 0o777, 0o700);
    for (const filename of ["metadata.json", "samples.csv", "summary.json"]) {
        assert.equal(fs.statSync(path.join(first, filename)).mode & 0o777, 0o600);
    }
});
