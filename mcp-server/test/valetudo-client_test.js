import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";

import { ValetudoClient } from "../lib/valetudo-client.js";

async function withServer(handler, callback) {
    const server = http.createServer(handler);
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));

    try {
        const address = server.address();
        await callback(address.port);
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
}

test("sends Basic Auth and parses JSON responses", async () => {
    await withServer((request, response) => {
        assert.equal(request.headers.authorization, "Basic dXNlcjpzZWNyZXQ=");
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify({ok: true}));
    }, async port => {
        const client = new ValetudoClient({
            host: "127.0.0.1",
            port: port,
            timeoutMs: 1000,
            username: "user",
            password: "secret",
        });
        assert.deepEqual(await client.getRobotState(), {ok: true});
    });
});

test("handles text and empty success responses", async () => {
    let requestCount = 0;
    await withServer((request, response) => {
        requestCount += 1;
        response.statusCode = 200;
        response.end(requestCount === 1 ? "plain text" : "");
    }, async port => {
        const client = new ValetudoClient({host: "127.0.0.1", port: port, timeoutMs: 1000});
        assert.equal(await client.getRobotInfo(), "plain text");
        assert.deepEqual(await client.getCapabilities(), {ok: true});
    });
});

test("returns useful non-success errors without exposing credentials", async () => {
    await withServer((request, response) => {
        response.statusCode = 503;
        response.statusMessage = "Unavailable";
        response.end("try later");
    }, async port => {
        const client = new ValetudoClient({
            host: "127.0.0.1",
            port: port,
            timeoutMs: 1000,
            username: "user",
            password: "top-secret-value",
        });
        await assert.rejects(client.getRobotState(), error => {
            assert.match(error.message, /503 Unavailable.*try later/);
            assert.doesNotMatch(error.message, /top-secret-value/);
            return true;
        });
    });
});

test("cancels requests that exceed the configured timeout", async () => {
    await withServer(() => undefined, async port => {
        const client = new ValetudoClient({host: "127.0.0.1", port: port, timeoutMs: 100});
        await assert.rejects(client.getRobotState(), /timed out after 100ms/);
    });
});
