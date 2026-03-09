/**
 * ValetudoClient — HTTP client for the Valetudo REST API.
 *
 * Wraps fetch() calls to the Valetudo webserver running on the vacuum.
 * All capability endpoints live under /api/v2/robot/capabilities/<CapabilityName>.
 */

import fetch from "node-fetch";

export class ValetudoClient {
    /**
     * @param {object} options
     * @param {string} options.host - Vacuum IP/hostname
     * @param {number} [options.port=80] - Valetudo webserver port
     * @param {string} [options.username] - Basic auth username (if enabled)
     * @param {string} [options.password] - Basic auth password (if enabled)
     */
    constructor(options) {
        this.baseUrl = `http://${options.host}:${options.port || 80}`;
        this.auth = null;

        if (options.username && options.password) {
            this.auth = Buffer.from(`${options.username}:${options.password}`).toString("base64");
        }
    }

    /**
     * @param {string} path - API path (e.g., "/api/v2/robot/capabilities/BasicControlCapability")
     * @param {object} [options]
     * @param {string} [options.method="GET"]
     * @param {object} [options.body]
     * @returns {Promise<any>}
     */
    async request(path, options = {}) {
        const url = `${this.baseUrl}${path}`;
        const method = options.method || "GET";

        const headers = {
            "Content-Type": "application/json",
        };

        if (this.auth) {
            headers["Authorization"] = `Basic ${this.auth}`;
        }

        const fetchOptions = { method, headers };

        if (options.body && (method === "PUT" || method === "POST")) {
            fetchOptions.body = JSON.stringify(options.body);
        }

        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Valetudo API error: ${response.status} ${response.statusText} — ${text}`);
        }

        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            return response.json();
        }

        // Some endpoints return 200 with no body
        if (response.status === 200) {
            const text = await response.text();
            return text.length > 0 ? text : { ok: true };
        }

        return { ok: true };
    }

    // ── Convenience helpers ──────────────────────────────────────────────

    /**
     * GET a capability endpoint
     * @param {string} capability - e.g., "BasicControlCapability"
     * @param {string} [subpath=""] - e.g., "/urls"
     */
    async getCapability(capability, subpath = "") {
        return this.request(`/api/v2/robot/capabilities/${capability}${subpath}`);
    }

    /**
     * PUT to a capability endpoint (action)
     * @param {string} capability
     * @param {object} body - e.g., { action: "start" }
     */
    async putCapability(capability, body) {
        return this.request(`/api/v2/robot/capabilities/${capability}`, {
            method: "PUT",
            body,
        });
    }

    /** Get the robot state */
    async getRobotState() {
        return this.request("/api/v2/robot/state");
    }

    /** Get the robot model info and attributes */
    async getRobotInfo() {
        return this.request("/api/v2/robot");
    }

    /** Get available capabilities list */
    async getCapabilities() {
        return this.request("/api/v2/robot/capabilities");
    }
}
