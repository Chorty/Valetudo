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

test("aborts and rejects a response body larger than the configured cap", async () => {
    let clientAborted = false;

    await withServer((request, response) => {
        response.setHeader("Content-Type", "application/json");
        response.write("[");
        // Keep streaming well past the tiny cap below, but stop cleanly once the
        // client disconnects instead of writing to a closed socket forever.
        const interval = setInterval(() => {
            if (clientAborted) {
                clearInterval(interval);
                return;
            }
            response.write("0,".repeat(1024));
        }, 5);
        request.on("aborted", () => {
            clientAborted = true;
            clearInterval(interval);
        });
    }, async port => {
        const client = new ValetudoClient({host: "127.0.0.1", port: port, timeoutMs: 1000, maxResponseBytes: 1024});
        await assert.rejects(client.getRobotState(), /response exceeded 1024 bytes/);

        // The abort propagates to the server asynchronously; give it a moment
        // rather than asserting the instant the client-side promise rejects.
        for (let i = 0; i < 50 && !clientAborted; i++) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    });

    assert.equal(clientAborted, true, "the client must abort the connection, not just stop reading");
});

test("accepts a response body right up to the configured cap", async () => {
    await withServer((request, response) => {
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify({padding: "x".repeat(1000)}));
    }, async port => {
        const client = new ValetudoClient({host: "127.0.0.1", port: port, timeoutMs: 1000, maxResponseBytes: 10 * 1024 * 1024});
        const result = await client.getRobotState();
        assert.equal(result.padding.length, 1000);
    });
});
