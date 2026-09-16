const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

const Logger = require("../../../lib/Logger");
const MiioValetudoRobot = require("../../../lib/robots/MiioValetudoRobot");

describe("MiioValetudoRobot", () => {
    describe("startup", () => {
        it("logs device info without exposing the cloud or local secrets", (t) => {
            const messages = [];
            t.mock.method(Logger, "info", (message) => {
                messages.push(message);
            });

            // MiioValetudoRobot is abstract and its constructor opens real sockets, so this
            // calls the unbound method against a minimal stand-in instead of instantiating it.
            const fakeRobot = {
                deviceId: 12345,
                ip: "192.168.1.31",
                cloudSecret: Buffer.from("supersecretcloudvalue1234567890"),
                localSecret: Buffer.from("supersecretlocalvalue1234567890"),
            };

            MiioValetudoRobot.prototype.startup.call(fakeRobot);

            assert.deepEqual(messages, [
                "DeviceId 12345",
                "IP 192.168.1.31",
                "CloudSecret <redacted>",
                "LocalSecret <redacted>"
            ]);
        });
    });
});
