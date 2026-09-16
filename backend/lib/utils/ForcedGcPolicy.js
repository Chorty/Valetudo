/**
 * Decides when Valetudo should force a garbage collection.
 *
 * The decision uses the memory a garbage collection can actually reclaim: the V8 heap plus
 * external allocations such as Buffers. RSS is not usable for this, because it also counts the
 * file-backed pages of the executable itself (about 22 MiB for the aarch64 build), which no
 * garbage collection can release. Once those pages were resident, an RSS trigger forced a full
 * collection every 2.5 seconds without ever getting below its threshold.
 *
 * A forced collection that does not bring usage back under the threshold doubles the wait before
 * the next one, so memory that simply is in use can never cause a collection loop.
 */
class ForcedGcPolicy {
    /**
     * @param {object} options
     * @param {number} options.thresholdBytes
     * @param {number} [options.minIntervalMs]
     * @param {number} [options.maxIntervalMs]
     */
    constructor(options) {
        this.thresholdBytes = options.thresholdBytes;
        this.minIntervalMs = options.minIntervalMs ?? 2500;
        this.maxIntervalMs = options.maxIntervalMs ?? 60000;

        this.intervalMs = this.minIntervalMs;
        this.lastCollectionMs = -Infinity;
    }

    /**
     * @param {{heapUsed: number, external: number}} memoryUsage as returned by process.memoryUsage()
     * @returns {number}
     */
    static getReclaimableBytes(memoryUsage) {
        return memoryUsage.heapUsed + memoryUsage.external;
    }

    /**
     * @param {{heapUsed: number, external: number}} memoryUsage
     * @param {number} nowMs
     * @returns {boolean}
     */
    shouldCollect(memoryUsage, nowMs) {
        if (ForcedGcPolicy.getReclaimableBytes(memoryUsage) <= this.thresholdBytes) {
            this.intervalMs = this.minIntervalMs;

            return false;
        }

        return nowMs - this.lastCollectionMs >= this.intervalMs;
    }

    /**
     * @param {{heapUsed: number, external: number}} memoryUsageAfter usage measured right after the collection
     * @param {number} nowMs
     */
    recordCollection(memoryUsageAfter, nowMs) {
        this.lastCollectionMs = nowMs;

        if (ForcedGcPolicy.getReclaimableBytes(memoryUsageAfter) > this.thresholdBytes) {
            this.intervalMs = Math.min(this.intervalMs * 2, this.maxIntervalMs);
        } else {
            this.intervalMs = this.minIntervalMs;
        }
    }
}

module.exports = ForcedGcPolicy;
