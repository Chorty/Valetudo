const DEFAULT_PORT = 80;
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
    const username = env.VALETUDO_USERNAME?.trim() || undefined;
    const password = env.VALETUDO_PASSWORD || undefined;

    if (!host) {
        throw new Error("VALETUDO_HOST is required");
    }
    if ((username && !password) || (!username && password)) {
        throw new Error("VALETUDO_USERNAME and VALETUDO_PASSWORD must be supplied together");
    }

    return {
        host: host,
        port: parseInteger(env.VALETUDO_PORT, "VALETUDO_PORT", DEFAULT_PORT, 1, 65535),
        timeoutMs: parseInteger(
            env.VALETUDO_TIMEOUT_MS,
            "VALETUDO_TIMEOUT_MS",
            DEFAULT_TIMEOUT_MS,
            MIN_TIMEOUT_MS,
            MAX_TIMEOUT_MS
        ),
        username: username,
        password: password,
    };
}
