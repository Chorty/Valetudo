const {execFileSync} = require("node:child_process");

// HTTP is permitted only for an explicitly selected literal loopback endpoint
// (an SSH tunnel terminating on the robot). Never downgrade a TLS failure.
function validateOrigin(value) {
    let url;
    try {
        url = new URL(value);
    } catch {
        throw new Error("Valetudo URL must be an origin without credentials, a path, a query, or a fragment");
    }
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash ||
        !["https:", "http:"].includes(url.protocol)) {
        throw new Error("Valetudo URL must be an origin without credentials, a path, a query, or a fragment");
    }
    if (url.protocol === "http:" && !["127.0.0.1", "[::1]"].includes(url.hostname)) {
        throw new Error("Valetudo requires HTTPS; HTTP is allowed only on literal loopback for an SSH tunnel");
    }
    return url.origin;
}

function validateCredentials(username, password) {
    if (username === undefined && password === undefined) {
        return {};
    }
    if (typeof username !== "string" || !username || typeof password !== "string" || !password) {
        throw new Error("VALETUDO_USERNAME and VALETUDO_PASSWORD must be supplied together");
    }
    if (/[:\x00-\x1f\x7f]/.test(username) || /[\x00-\x1f\x7f]/.test(password)) {
        throw new Error("Valetudo credentials contain unsupported characters");
    }
    return {username, password};
}

function readCredentials(env = process.env, execute = execFileSync) {
    if (env.VALETUDO_USERNAME !== undefined || env.VALETUDO_PASSWORD !== undefined) {
        return validateCredentials(env.VALETUDO_USERNAME, env.VALETUDO_PASSWORD);
    }
    const service = env.VALETUDO_AUTH_SERVICE;
    if (!service) {
        return {};
    }
    const options = {encoding: "utf8", timeout: 10000, maxBuffer: 16384, stdio: ["ignore", "pipe", "pipe"]};
    let details;
    try {
        details = execute("/usr/bin/security", ["find-generic-password", "-s", service], options);
    } catch (error) {
        if (error.status === 44) {
            return {};
        }
        throw new Error("Cannot read Valetudo Keychain entry");
    }
    const username = details.match(/^\s*"acct"<blob>="([^"\\]+)"\s*$/m)?.[1];
    if (!username) {
        throw new Error("Valetudo Keychain entry has an unsupported account");
    }
    let password;
    try {
        password = execute("/usr/bin/security", ["find-generic-password", "-s", service, "-a", username, "-w"], options).replace(/\r?\n$/, "");
    } catch {
        throw new Error("Cannot read Valetudo Keychain password");
    }
    return validateCredentials(username, password);
}

function authorization(credentials = {}) {
    const pair = validateCredentials(credentials.username, credentials.password);
    return pair.username ? `Basic ${Buffer.from(`${pair.username}:${pair.password}`).toString("base64")}` : undefined;
}

module.exports = {authorization, readCredentials, validateCredentials, validateOrigin};
