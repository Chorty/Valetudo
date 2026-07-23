const assert = require("node:assert/strict");
const test = require("node:test");

const Profiler = require("../../../util/vacuum_resource_profiler");

test("profiler options reject URLs containing credentials", () => {
    assert.throws(() => Profiler.parseArguments(["--http-base", "http://user:secret@vacuum/"]), /without credentials/);
    assert.throws(() => Profiler.parseArguments(["--duration", "0"]), /positive number/);
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
