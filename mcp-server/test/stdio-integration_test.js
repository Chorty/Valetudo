import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("stdio server exposes 49 tools and forwards representative calls", async () => {
    const requests = [];
    const fakeValetudo = http.createServer((request, response) => {
        const chunks = [];
        request.on("data", chunk => chunks.push(chunk));
        request.on("end", () => {
            requests.push({
                method: request.method,
                path: request.url,
                body: chunks.length > 0 ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : undefined,
            });
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify(request.method === "GET" ? {status: "docked"} : {ok: true}));
        });
    });
    await new Promise(resolve => fakeValetudo.listen(0, "127.0.0.1", resolve));
    const port = fakeValetudo.address().port;
    const transport = new StdioClientTransport({
        command: process.execPath,
        args: [path.join(__dirname, "../index.js")],
        cwd: path.join(__dirname, ".."),
        env: {
            VALETUDO_HOST: "127.0.0.1",
            VALETUDO_PORT: String(port),
            VALETUDO_TIMEOUT_MS: "1000",
        },
        stderr: "pipe",
    });
    const client = new Client({name: "integration-test", version: "1.0.0"});

    try {
        await client.connect(transport);
        const tools = await client.listTools();
        assert.equal(tools.tools.length, 49);
        assert.equal(tools.tools.some(tool => tool.name === "stream_set_quality"), false);
        assert.equal(tools.tools.some(tool => tool.name === "stream_get_quality"), false);

        const stateResult = await client.callTool({name: "vacuum_get_state", arguments: {}});
        assert.match(stateResult.content[0].text, /docked/);
        await client.callTool({name: "vacuum_pause", arguments: {}});

        assert.deepEqual(requests.slice(-2), [
            {method: "GET", path: "/api/v2/robot/state", body: undefined},
            {
                method: "PUT",
                path: "/api/v2/robot/capabilities/BasicControlCapability",
                body: {action: "pause"},
            },
        ]);
    } finally {
        await client.close();
        await new Promise(resolve => fakeValetudo.close(resolve));
    }
});
