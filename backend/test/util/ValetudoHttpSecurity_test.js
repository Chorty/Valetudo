const assert = require("node:assert/strict");
const test = require("node:test");
const {authorization, readCredentials, validateOrigin} = require("../../../util/valetudo_http_security");

test("origins require TLS except literal loopback and never echo rejected input", () => {
    for (const url of ["http://192.168.1.31", "http://localhost", "https://user:secret@example.com", "https://example.com/path", "https://example.com?secret", "broken-secret"]) {
        assert.throws(() => validateOrigin(url), error => !error.message.includes("secret"));
    }
    assert.equal(validateOrigin("https://vacuum:443/"), "https://vacuum");
    assert.equal(validateOrigin("http://127.0.0.1:8080"), "http://127.0.0.1:8080");
    assert.equal(validateOrigin("http://[::1]:8080"), "http://[::1]:8080");
});

test("credentials require a complete unambiguous pair and do not fall back on partial input", () => {
    for (const env of [{VALETUDO_USERNAME: "user"}, {VALETUDO_PASSWORD: "secret"}, {VALETUDO_USERNAME: "user:other", VALETUDO_PASSWORD: "secret"}]) {
        assert.throws(() => readCredentials({...env, VALETUDO_AUTH_SERVICE: "test"}, () => assert.fail("must not read Keychain")));
    }
    assert.equal(authorization(readCredentials({VALETUDO_USERNAME: "user", VALETUDO_PASSWORD: "secret"})), "Basic dXNlcjpzZWNyZXQ=");
});

test("Keychain stays off argv, distinguishes missing from failure, and sanitizes subprocess errors", () => {
    const env = {VALETUDO_AUTH_SERVICE: "test"};
    const calls = [];
    const pair = readCredentials(env, (file, args) => {
        calls.push(args);
        return args.includes("-w") ? "private-password\n" : '    "acct"<blob>="user"\n';
    });
    assert.equal(pair.password, "private-password");
    assert.ok(!JSON.stringify(calls).includes(pair.password));
    assert.deepEqual(readCredentials(env, () => {
        throw {status: 44};
    }), {});
    assert.throws(() => readCredentials(env, () => {
        throw new Error("private-password");
    }), error => !error.message.includes("private-password"));
});
