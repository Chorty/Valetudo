const assert = require("node:assert");
const { describe, it } = require("node:test");

const ForcedGcPolicy = require("../../../lib/utils/ForcedGcPolicy");

const MiB = 1024 * 1024;

/**
 * @param {number} heapUsedMiB
 * @param {number} externalMiB
 * @param {number} [rssMiB]
 */
function usage(heapUsedMiB, externalMiB, rssMiB = 0) {
    return { heapUsed: heapUsedMiB * MiB, external: externalMiB * MiB, rss: rssMiB * MiB };
}

describe("ForcedGcPolicy", () => {

    it("ignores RSS, including file-backed executable pages", () => {
        const policy = new ForcedGcPolicy({ thresholdBytes: 64 * MiB });

        // Measured on a Dreame L10S after 6.4 hours: RSS far above the old heap limit + 10 MiB trigger
        assert.strictEqual(policy.shouldCollect(usage(40, 4, 78.5), 0), false);
    });

    it("counts external allocations such as buffers", () => {
        const policy = new ForcedGcPolicy({ thresholdBytes: 64 * MiB });

        assert.strictEqual(policy.shouldCollect(usage(40, 24), 0), false);
        assert.strictEqual(policy.shouldCollect(usage(40, 25), 0), true);
    });

    it("rate-limits collections", () => {
        const policy = new ForcedGcPolicy({ thresholdBytes: 64 * MiB, minIntervalMs: 2500 });

        assert.strictEqual(policy.shouldCollect(usage(40, 30), 10000), true);
        policy.recordCollection(usage(30, 5), 10000);

        assert.strictEqual(policy.shouldCollect(usage(40, 30), 12499), false);
        assert.strictEqual(policy.shouldCollect(usage(40, 30), 12500), true);
    });

    it("backs off while collections do not help, up to the maximum interval", () => {
        const policy = new ForcedGcPolicy({ thresholdBytes: 64 * MiB, minIntervalMs: 2500, maxIntervalMs: 20000 });
        const stuck = usage(60, 10);
        let now = 0;
        const waits = [];

        for (let i = 0; i < 6; i++) {
            assert.strictEqual(policy.shouldCollect(stuck, now), true);
            policy.recordCollection(stuck, now);

            let wait = 0;
            while (!policy.shouldCollect(stuck, now + wait)) {
                wait += 250;
            }
            waits.push(wait);
            now += wait;
        }

        assert.deepStrictEqual(waits, [5000, 10000, 20000, 20000, 20000, 20000]);
    });

    it("returns to the minimum interval after an effective collection", () => {
        const policy = new ForcedGcPolicy({ thresholdBytes: 64 * MiB, minIntervalMs: 2500 });

        policy.recordCollection(usage(60, 10), 0);
        policy.recordCollection(usage(60, 10), 5000);
        assert.strictEqual(policy.intervalMs, 10000);

        policy.recordCollection(usage(30, 5), 15000);
        assert.strictEqual(policy.intervalMs, 2500);
        assert.strictEqual(policy.shouldCollect(usage(60, 10), 17500), true);
    });

    it("returns to the minimum interval once usage falls below the threshold", () => {
        const policy = new ForcedGcPolicy({ thresholdBytes: 64 * MiB, minIntervalMs: 2500 });

        policy.recordCollection(usage(60, 10), 0);
        policy.recordCollection(usage(60, 10), 5000);
        assert.strictEqual(policy.intervalMs, 10000);

        assert.strictEqual(policy.shouldCollect(usage(30, 5), 6000), false);
        assert.strictEqual(policy.intervalMs, 2500);
        assert.strictEqual(policy.shouldCollect(usage(60, 10), 7500), true);
    });
});
