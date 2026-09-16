const express = require("express");
const os = require("os");
const Tools = require("../utils/Tools");

class SystemRouter {
    /**
     *
     * @param {object} options
     * @param {import("../PhoenixManager")} options.phoenixManager
     */
    constructor(options) {
        this.router = express.Router({mergeParams: true});
        this.phoenixManager = options.phoenixManager;

        this.initRoutes();
    }


    initRoutes() {
        this.router.get("/host/info", async (req, res) => {
            const systemStats = await Tools.GET_SYSTEM_STATS();

            res.json({
                hostname: os.hostname(),
                arch: os.arch(),
                uptime: Math.floor(os.uptime()),
                ...systemStats,
            });
        });

        this.router.get("/runtime/info", (req, res) => {
            res.json({
                uptime: Math.floor(process.uptime()),
                argv: process.argv,
                execArgv: process.execArgv,
                execPath: process.execPath,
                uid: typeof process.getuid === "function" ? process.geteuid() : -1,
                gid: typeof process.getegid === "function" ? process.getegid() : -1,
                pid: process.pid,
                versions: process.versions,
                env: SystemRouter.REDACT_SENSITIVE_ENV_VARS(process.env),
                phoenix: {
                    canReincarnate: this.phoenixManager.canReincarnate(),
                    generation: this.phoenixManager.cycleData.generation
                }
            });
        });
    }

    getRouter() {
        return this.router;
    }

    /**
     * This endpoint exists for debugging, but dumping the entire process environment
     * unconditionally is risky on a setup with Basic Auth disabled -- a supported,
     * documented configuration for trusted LAN use -- since anything sensitive that ends
     * up there (now or in some future env var) becomes readable by anyone on the network.
     *
     * Values are redacted by key name, not removed, so the response shape and legitimate
     * debugging value (which vars are set, and their non-sensitive values) are preserved.
     *
     * @param {object} env
     * @returns {object}
     */
    static REDACT_SENSITIVE_ENV_VARS(env) {
        return Object.fromEntries(
            Object.entries(env).map(([key, value]) => {
                return [key, SystemRouter.SENSITIVE_ENV_KEY_PATTERN.test(key) ? "<redacted>" : value];
            })
        );
    }
}

SystemRouter.SENSITIVE_ENV_KEY_PATTERN = /secret|password|passwd|token|credential|auth|key/i;

module.exports = SystemRouter;
