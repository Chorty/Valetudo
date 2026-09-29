import security from "../../util/valetudo_http_security.js";
const DEFAULT_TIMEOUT_MS = 10000;
const MIN_TIMEOUT_MS = 100;
const MAX_TIMEOUT_MS = 120000;

function parseInteger(value, name, defaultValue, minimum, maximum) {
    const rawValue = value === undefined || value === "" ? String(defaultValue) : value;
    const parsedValue = Number(rawValue);

    if (!Number.isInteger(parsedValue) || parsedValue < minimum || parsedValue > maximum) {
        throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
    }

    return parsedValue;
}

export function readConfig(env = process.env) {
    const host = env.VALETUDO_HOST?.trim();
    if (!env.VALETUDO_URL && !host) {
        throw new Error("VALETUDO_URL or VALETUDO_HOST is required");
    }
    if (env.VALETUDO_URL && (host || env.VALETUDO_PORT)) {
        throw new Error("Use VALETUDO_URL or VALETUDO_HOST/PORT, not both");
    }
    if (host && !/^(?:[a-zA-Z0-9.-]+|\[::1\])$/.test(host)) {
        throw new Error("VALETUDO_HOST must contain only a hostname or IP address");
    }
    const protocol = ["127.0.0.1", "[::1]"].includes(host) ? "http" : "https";
    const port = parseInteger(env.VALETUDO_PORT, "VALETUDO_PORT", protocol === "https" ? 443 : 80, 1, 65535);
    const baseUrl = security.validateOrigin(env.VALETUDO_URL || `${protocol}://${host}:${port}`);
    const credentials = security.readCredentials(env);

    return {
        baseUrl: baseUrl,
        timeoutMs: parseInteger(
            env.VALETUDO_TIMEOUT_MS,
            "VALETUDO_TIMEOUT_MS",
            DEFAULT_TIMEOUT_MS,
            MIN_TIMEOUT_MS,
            MAX_TIMEOUT_MS
        ),
        ...credentials,
    };
}
