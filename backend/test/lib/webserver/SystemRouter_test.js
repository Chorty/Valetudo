const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

const SystemRouter = require("../../../lib/webserver/SystemRouter");

describe("SystemRouter", () => {
    describe("REDACT_SENSITIVE_ENV_VARS", () => {
        it("redacts values whose key name looks secret-shaped", () => {
            const redacted = SystemRouter.REDACT_SENSITIVE_ENV_VARS({
                PATH: "/usr/bin:/bin",
                HOME: "/root",
                VALETUDO_CONFIG_PATH: "/data/valetudo_config.json",
                VALETUDO_SLOW_REQUEST_MS: "500",
                VALETUDO_PASSWORD: "hunter2",
                HA_TOKEN: "abcdef",
                CLOUD_SECRET: "topsecret",
                API_KEY: "k-123",
                DB_PASSWD: "swordfish",
                AUTH_HEADER: "Basic abc123",
                SSH_CREDENTIAL_STORE: "/dev/null",
            });

            assert.deepEqual(redacted, {
                PATH: "/usr/bin:/bin",
                HOME: "/root",
                VALETUDO_CONFIG_PATH: "/data/valetudo_config.json",
                VALETUDO_SLOW_REQUEST_MS: "500",
                VALETUDO_PASSWORD: "<redacted>",
                HA_TOKEN: "<redacted>",
                CLOUD_SECRET: "<redacted>",
                API_KEY: "<redacted>",
                DB_PASSWD: "<redacted>",
                AUTH_HEADER: "<redacted>",
                SSH_CREDENTIAL_STORE: "<redacted>",
            });
        });

        it("matches case-insensitively", () => {
            const redacted = SystemRouter.REDACT_SENSITIVE_ENV_VARS({ my_Secret_Var: "x" });

            assert.equal(redacted.my_Secret_Var, "<redacted>");
        });

        it("does not mutate the input or drop unrelated keys", () => {
            const original = { PATH: "/usr/bin", MY_TOKEN: "x" };

            SystemRouter.REDACT_SENSITIVE_ENV_VARS(original);

            assert.deepEqual(original, { PATH: "/usr/bin", MY_TOKEN: "x" });
        });
    });
});
