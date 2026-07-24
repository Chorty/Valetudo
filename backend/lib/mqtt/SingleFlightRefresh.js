class SingleFlightRefresh {
    /**
     * @param {object} options
     * @param {object} options.logger
     * @param {function(): number} [options.now]
     * @param {function(): Promise<void>} options.refresh
     */
    constructor(options) {
        this.logger = options.logger;
        this.now = options.now || (() => Date.now());
        this.refresh = options.refresh;

        this.inProgress = false;
        this.lastSkipWarningAt = null;
        this.skippedSinceWarning = 0;
        this.totalSkipped = 0;
    }

    /**
     * @returns {Promise<boolean>} True if a refresh ran; false if it was skipped.
     */
    async run() {
        const now = this.now();
        if (this.inProgress) {
            this.totalSkipped += 1;
            this.skippedSinceWarning += 1;
            if (this.lastSkipWarningAt === null || now - this.lastSkipWarningAt >= SingleFlightRefresh.SKIP_WARNING_INTERVAL_MS) {
                this.logger.warn("Skipped overlapping MQTT auto refresh", {
                    elapsedMs: now - this.startedAt,
                    skippedCycles: this.skippedSinceWarning,
                    totalSkippedCycles: this.totalSkipped
                });
                this.lastSkipWarningAt = now;
                this.skippedSinceWarning = 0;
            }
            return false;
        }

        this.inProgress = true;
        this.startedAt = now;
        try {
            await this.refresh();
            const durationMs = this.now() - this.startedAt;
            if (durationMs >= SingleFlightRefresh.WARNING_THRESHOLD_MS) {
                this.logger.warn("MQTT auto refresh completed slowly", {durationMs: durationMs});
            } else if (durationMs >= SingleFlightRefresh.INFO_THRESHOLD_MS) {
                this.logger.info("MQTT auto refresh completed slowly", {durationMs: durationMs});
            }
        } catch (reason) {
            this.logger.error("Failed auto refresh:", reason);
        } finally {
            this.inProgress = false;
        }
        return true;
    }
}

SingleFlightRefresh.INFO_THRESHOLD_MS = 5 * 1000;
SingleFlightRefresh.WARNING_THRESHOLD_MS = 30 * 1000;
SingleFlightRefresh.SKIP_WARNING_INTERVAL_MS = 5 * 60 * 1000;

module.exports = SingleFlightRefresh;
