const assert = require("node:assert/strict");
const fs = require("node:fs");
const https = require("node:https");
const os = require("node:os");
const path = require("node:path");
const Profiler = require("../../../util/vacuum_resource_profiler");
const test = require("node:test");
const {execFileSync} = require("node:child_process");

test("both clients enforce certificate trust, hostname and expiry while sending Basic Auth over TLS", async t => {
    const {ValetudoClient} = await import("../../../mcp-server/lib/valetudo-client.js");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "valetudo-tls-test-"));
    t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
    const key = path.join(dir, "key.pem");
    const csr = path.join(dir, "request.pem");
    const extensions = path.join(dir, "extensions.cnf");
    execFileSync("openssl", ["req", "-new", "-newkey", "ec", "-pkeyopt", "ec_paramgen_curve:P-256", "-nodes",
        "-subj", "/CN=test.invalid", "-keyout", key, "-out", csr], {stdio: "ignore"});
    for (const [name, san, days] of [["valid", "IP:127.0.0.1", "30"], ["wrong", "DNS:wrong.invalid", "30"], ["expired", "IP:127.0.0.1", "0"]]) {
        const certificate = path.join(dir, `${name}.pem`);
        fs.writeFileSync(extensions, `subjectAltName=${san}\n`);
        execFileSync("openssl", ["x509", "-req", "-in", csr, "-signkey", key, "-days", days, "-extfile", extensions, "-out", certificate], {stdio: "ignore"});
        const cert = fs.readFileSync(certificate);
        let requests = 0;
        const server = https.createServer({key: fs.readFileSync(key), cert: cert}, (request, response) => {
            requests++;
            assert.equal(request.headers.authorization, "Basic dXNlcjpzZWNyZXQ=");
            response.setHeader("Content-Type", "application/json");
            response.end('{"ok":true}');
        });
        await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
        const originalAgent = https.globalAgent;
        const origin = `https://127.0.0.1:${server.address().port}`;
        const client = new ValetudoClient({baseUrl: origin, username: "user", password: "secret", timeoutMs: 1000});
        try {
            // An explicit option takes precedence over the NODE_TLS_REJECT_UNAUTHORIZED default.
            assert.equal(client.agent.options.rejectUnauthorized, true);
            await assert.rejects(client.getRobotState(), /TLS verification/);
            assert.equal((await Profiler.measureHttp(origin, 1000)).ok, false);
            assert.equal(requests, 0);
            client.agent.options.ca = cert;
            https.globalAgent = new https.Agent({ca: cert});
            const measurement = await Profiler.measureHttp(origin, 1000, false, "identity", {username: "user", password: "secret"});
            if (name === "valid") {
                assert.deepEqual(await client.getRobotState(), {ok: true});
                assert.equal(measurement.ok, true);
                assert.equal(requests, 2);
            } else {
                await assert.rejects(client.getRobotState(), /TLS verification/);
                assert.equal(measurement.ok, false);
                assert.equal(requests, 0);
            }
        } finally {
            client.agent.destroy();
            if (https.globalAgent !== originalAgent) {
                https.globalAgent.destroy();
            }
            https.globalAgent = originalAgent;
            await new Promise(resolve => server.close(resolve));
        }
    }
});
