import assert from "node:assert/strict";
import test from "node:test";

import { readConfig } from "../lib/config.js";

test("requires an explicit Valetudo host", () => {
    assert.throws(() => readConfig({}), /VALETUDO_URL or VALETUDO_HOST is required/);
});

test("applies safe defaults", () => {
    assert.deepEqual(readConfig({VALETUDO_HOST: "192.168.1.31"}), {
        baseUrl: "https://192.168.1.31",
        timeoutMs: 10000,
    });
});

test("requires Basic Auth credentials as a pair", () => {
    assert.throws(
        () => readConfig({VALETUDO_HOST: "vacuum", VALETUDO_USERNAME: "user"}),
        /must be supplied together/
    );
    assert.throws(
        () => readConfig({VALETUDO_HOST: "vacuum", VALETUDO_PASSWORD: "secret"}),
        /must be supplied together/
    );
});

test("validates port and timeout ranges", () => {
    assert.throws(
        () => readConfig({VALETUDO_HOST: "vacuum", VALETUDO_PORT: "0"}),
        /VALETUDO_PORT/
    );
    assert.throws(
        () => readConfig({VALETUDO_HOST: "vacuum", VALETUDO_TIMEOUT_MS: "99"}),
        /VALETUDO_TIMEOUT_MS/
    );
    assert.throws(
        () => readConfig({VALETUDO_HOST: "vacuum", VALETUDO_TIMEOUT_MS: "120001"}),
        /VALETUDO_TIMEOUT_MS/
    );
});
