const assert = require("node:assert/strict");
const test = require("node:test");

const SingleFlightRefresh = require("../../../lib/mqtt/SingleFlightRefresh");

test("overlapping MQTT refreshes are skipped and the lock releases after success", async () => {
    const deferred = createDeferred();
    const logger = createLogger();
    let calls = 0;
    const refresh = new SingleFlightRefresh({
        logger: logger,
        refresh: async () => {
            calls += 1;
            await deferred.promise;
        }
    });

    const running = refresh.run();
    assert.equal(await refresh.run(), false);
    assert.equal(calls, 1);
    assert.equal(refresh.totalSkipped, 1);
    assert.equal(logger.warnCalls.length, 1);

    deferred.resolve();
    assert.equal(await running, true);
    assert.equal(refresh.inProgress, false);
});

test("MQTT refresh lock releases after errors", async () => {
    const logger = createLogger();
    let calls = 0;
    const refresh = new SingleFlightRefresh({
        logger: logger,
        refresh: async () => {
            calls += 1;
            if (calls === 1) {
                throw new Error("test failure");
            }
        }
    });

    assert.equal(await refresh.run(), true);
    assert.equal(refresh.inProgress, false);
    assert.equal(logger.errorCalls.length, 1);
    assert.equal(await refresh.run(), true);
    assert.equal(calls, 2);
});

test("MQTT slow refresh logging uses info and warning thresholds", async () => {
    let now = 0;
    const logger = createLogger();
    const durations = [5000, 30000];
    const refresh = new SingleFlightRefresh({
        logger: logger,
        now: () => now,
        refresh: async () => {
            now += durations.shift();
        }
    });

    await refresh.run();
    await refresh.run();
    assert.equal(logger.infoCalls.length, 1);
    assert.equal(logger.warnCalls.length, 1);
    assert.equal(logger.warnCalls[0][1].durationMs, 30000);
});

test("overlap warnings are limited to one every five minutes", async () => {
    let now = 0;
    const deferred = createDeferred();
    const logger = createLogger();
    const refresh = new SingleFlightRefresh({logger: logger, now: () => now, refresh: () => deferred.promise});

    const running = refresh.run();
    await refresh.run();
    now += 1000;
    await refresh.run();
    assert.equal(logger.warnCalls.length, 1);
    now += SingleFlightRefresh.SKIP_WARNING_INTERVAL_MS;
    await refresh.run();
    assert.equal(logger.warnCalls.length, 2);
    assert.equal(logger.warnCalls[1][1].skippedCycles, 2);
    deferred.resolve();
    await running;
});

function createDeferred() {
    let resolve;
    const promise = new Promise(innerResolve => {
        resolve = innerResolve;
    });
    return {promise: promise, resolve: resolve};
}

function createLogger() {
    const errorCalls = [];
    const infoCalls = [];
    const warnCalls = [];
    return {
        error: (...args) => errorCalls.push(args),
        errorCalls: errorCalls,
        info: (...args) => infoCalls.push(args),
        infoCalls: infoCalls,
        warn: (...args) => warnCalls.push(args),
        warnCalls: warnCalls
    };
}
