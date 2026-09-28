/**
 * ValetudoClient — HTTP client for the Valetudo REST API.
 *
 * Wraps fetch() calls to the Valetudo webserver running on the vacuum.
 * All capability endpoints live under /api/v2/robot/capabilities/<CapabilityName>.
 */

import fetch from "node-fetch";
import https from "node:https";
import security from "../../util/valetudo_http_security.js";

export class ValetudoClient {
    /**
     * @param {object} options
     * @param {string} options.host - Vacuum IP/hostname
     * @param {number} [options.port=80] - Valetudo webserver port
     * @param {string} [options.username] - Basic auth username (if enabled)
     * @param {string} [options.password] - Basic auth password (if enabled)
     * @param {number} [options.timeoutMs=10000] - Per-request timeout in milliseconds
     * @param {number} [options.maxResponseBytes=10485760] - Response body cap; a well-behaved
     *   Valetudo never gets close to this even for a large multi-room map, but nothing here
     *   otherwise stops an oversized or endlessly streaming response from being buffered into
     *   memory in full before it can be parsed.
     */
    constructor(options) {
        const protocol = ["127.0.0.1", "[::1]"].includes(options.host) ? "http" : "https";
        this.baseUrl = security.validateOrigin(options.baseUrl || `${protocol}://${options.host}:${options.port || (protocol === "https" ? 443 : 80)}`);
        this.auth = security.authorization(options);
        this.agent = new https.Agent({rejectUnauthorized: true});
        this.timeoutMs = options.timeoutMs || 10000;
        this.maxResponseBytes = options.maxResponseBytes || 10 * 1024 * 1024;

    }

    /**
     * @param {string} path - API path (e.g., "/api/v2/robot/capabilities/BasicControlCapability")
     * @param {object} [options]
     * @param {string} [options.method="GET"]
     * @param {object} [options.body]
     * @returns {Promise<any>}
     */
    async request(path, options = {}) {
        if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//") || /[\\\r\n]/.test(path)) {
            throw new Error("Invalid Valetudo API path");
        }
        const url = new URL(path, this.baseUrl);
        if (url.origin !== this.baseUrl) {
            throw new Error("Invalid Valetudo API origin");
        }
        const method = options.method || "GET";

        const headers = {
            "Content-Type": "application/json",
        };

        if (this.auth) {
            headers["Authorization"] = this.auth;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
        timeout.unref?.();
        const fetchOptions = { method, headers, signal: controller.signal, redirect: "manual",
            agent: url.protocol === "https:" ? this.agent : undefined };

        if (options.body && (method === "PUT" || method === "POST")) {
            fetchOptions.body = JSON.stringify(options.body);
        }

        let response;
        let text;
        try {
            response = await fetch(url, fetchOptions);
            text = await this._readBoundedBody(response, controller);
        } catch (error) {
            if (error.name === "AbortError") {
                throw new Error(`Valetudo API request timed out after ${this.timeoutMs}ms`);
            }
            if (error.tooLarge) {
                throw new Error(`Valetudo API response exceeded ${this.maxResponseBytes} bytes`);
            }
            throw new Error("Valetudo API request failed (connection or TLS verification)");
        } finally {
            clearTimeout(timeout);
        }

        if (!response.ok) {
            throw new Error(`Valetudo API error: HTTP ${response.status}`);
        }

        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            try {
                return text.length > 0 ? JSON.parse(text) : { ok: true };
            } catch {
                throw new Error("Valetudo API returned invalid JSON");
            }
        }

        // Some endpoints return 200 with no body
        if (response.status === 200) {
            return text.length > 0 ? text : { ok: true };
        }

        return { ok: true };
    }

    /**
     * Reads a response body while enforcing maxResponseBytes, aborting the request rather
     * than letting an oversized or endlessly streaming body get buffered in full.
     *
     * @private
     * @param {import("node-fetch").Response} response
     * @param {AbortController} controller
     * @returns {Promise<string>}
     */
    async _readBoundedBody(response, controller) {
        const chunks = [];
        let total = 0;

        for await (const chunk of response.body) {
            total += chunk.length;

            if (total > this.maxResponseBytes) {
                controller.abort();
                const error = new Error(`response exceeded ${this.maxResponseBytes} bytes`);
                error.tooLarge = true;
                throw error;
            }

            chunks.push(chunk);
        }

        return Buffer.concat(chunks).toString("utf-8");
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
