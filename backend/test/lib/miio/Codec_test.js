const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

const Codec = require("../../../lib/miio/Codec");
const Logger = require("../../../lib/Logger");

const TOKEN = Buffer.alloc(16, 0x11);

/**
 * Builds a 32-byte miio packet header followed by optional payload bytes.
 * The checksum field is left as whatever checksumBytes are given, which for
 * every test here deliberately does not match the real MD5 checksum.
 *
 * @param {Buffer} checksumBytes 16 bytes
 * @param {Buffer} [payload]
 */
function packet(checksumBytes, payload = Buffer.alloc(0)) {
    const header = Buffer.alloc(2 + 2 + 4 + 4 + 4 + 16);
    checksumBytes.copy(header, 16);
    return Buffer.concat([header, payload]);
}

describe("Codec", () => {
    it("never logs the raw token when a checksum mismatch is reported", (t) => {
        const messages = [];
        t.mock.method(Logger, "error", (...args) => {
            messages.push(args);
        });

        const codec = new Codec({ token: TOKEN });
        const badChecksum = Buffer.alloc(16, 0xAA);

        codec.decodeIncomingMiioPacket(packet(badChecksum, Buffer.from("not empty")));

        assert.equal(messages.length, 1);
        const [, details] = messages[0];
        assert.equal(details.token, "<redacted>");
        assert.deepEqual(
            JSON.stringify(messages[0]).includes(TOKEN.toString("hex")),
            false,
            "the real token must never appear in the logged output"
        );
    });

    it("never logs a rotated handshake token in the clear", (t) => {
        const messages = [];
        t.mock.method(Logger, "info", (...args) => {
            messages.push(args);
        });

        const codec = new Codec({ token: TOKEN });
        const newToken = Buffer.alloc(16, 0x22);

        codec.decodeIncomingMiioPacket(packet(newToken));

        const handshakeMessages = messages.filter(args => args[0].includes("Got token from handshake"));
        assert.equal(handshakeMessages.length, 1);
        assert.deepEqual(handshakeMessages[0], ["Got token from handshake: <redacted>"]);
        assert.equal(codec.token.equals(newToken), true, "the token must still actually be rotated");
    });

    it("does not treat an all-0xff or all-0x00 checksum field as a token rotation", (t) => {
        const messages = [];
        t.mock.method(Logger, "info", (...args) => {
            messages.push(args);
        });

        const codec = new Codec({ token: TOKEN });

        codec.decodeIncomingMiioPacket(packet(Buffer.alloc(16, 0xFF)));
        codec.decodeIncomingMiioPacket(packet(Buffer.alloc(16, 0x00)));

        assert.deepEqual(messages.filter(args => args[0].includes("Got token from handshake")), []);
        assert.equal(codec.token.equals(TOKEN), true);
    });
});
