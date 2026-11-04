const assert = require("node:assert");
const { describe, it } = require("node:test");
const { EventEmitter } = require("node:events");

const Codec = require("../../../lib/miio/Codec");
const MiioSocket = require("../../../lib/miio/MiioSocket");

describe("MiioSocket", () => {
    it("generates MessageIds correctly", () => {
        // Jan 1970 means no synced time => 1 msgId per second
        assert.strictEqual(MiioSocket.calculateMsgId(new Date("1970-01-01T00:00:01.000Z")), 1);

        // Up until 1970-01-02, IDs are collision-free to allow the ntp sync to take some time
        assert.strictEqual(MiioSocket.calculateMsgId(new Date("1970-01-01T23:59:59.000Z")), 86399);
        assert.strictEqual(MiioSocket.calculateMsgId(new Date("1970-01-02T00:00:00.000Z")), 86400);

        assert.strictEqual(MiioSocket.calculateMsgId(new Date("1970-01-31T23:59:59.000Z")), 2678399);
        assert.strictEqual(MiioSocket.calculateMsgId(new Date("1970-02-01T00:00:00.000Z")), 2678400);

        // >= Feb 1970 means synced time => 1 msgId every 10ms
        assert.strictEqual(MiioSocket.calculateMsgId(new Date("1970-02-01T00:00:01.000Z")), 267926500);

        // wrapping occurs every ~5965 hours
        assert.strictEqual(MiioSocket.calculateMsgId(new Date("1972-09-21T03:58:09.870Z")), 2147483646);
        assert.strictEqual(MiioSocket.calculateMsgId(new Date("1972-09-21T03:58:09.880Z")), 86400);

        assert.strictEqual(MiioSocket.calculateMsgId(new Date("1973-05-27T16:57:42.340Z")), 2147483646);
        assert.strictEqual(MiioSocket.calculateMsgId(new Date("1973-05-27T16:57:42.350Z")), 86400);
    });
});

describe("MiioSocket peer handling", () => {
    const token = Buffer.from("00112233445566778899aabbccddeeff", "hex");
    const peer = {address: "127.0.0.1", port: 54321};

    function createSocket(acceptOnlyFromPeer) {
        const udp = new EventEmitter();
        udp.send = () => {};

        const miioSocket = new MiioSocket({
            socket: /** @type {any} */ (udp),
            token: token,
            deviceId: 1234,
            rinfo: Object.assign({}, peer),
            name: "local",
            isCloudSocket: false,
            acceptOnlyFromPeer: acceptOnlyFromPeer
        });

        return {udp: udp, miioSocket: miioSocket};
    }

    function response(id) {
        return new Codec({token: token}).encodeOutgoingMiioPacket({id: id, result: ["ok"]}, 1234);
    }

    function addPending(miioSocket, id) {
        const outcome = {result: undefined};
        miioSocket.pendingRequests[id] = {
            resolve: result => {
                outcome.result = result;
            },
            reject: () => {},
            onTimeoutCallback: () => {},
            method: "get_status"
        };

        return outcome;
    }

    it("accepts a response from the configured peer", () => {
        const {udp, miioSocket} = createSocket(true);
        const outcome = addPending(miioSocket, 7);

        udp.emit("message", response(7), Object.assign({}, peer));

        assert.deepStrictEqual(outcome.result, ["ok"]);
        assert.strictEqual(Object.hasOwn(miioSocket.pendingRequests, "7"), false);
    });

    it("ignores datagrams from any other address or port without adopting the sender", () => {
        const {udp, miioSocket} = createSocket(true);
        const outcome = addPending(miioSocket, 7);

        udp.emit("message", response(7), {address: "192.168.1.50", port: 54321});
        udp.emit("message", response(7), {address: "127.0.0.1", port: 40000});

        assert.strictEqual(outcome.result, undefined);
        assert.deepStrictEqual(miioSocket.rinfo, peer);
        assert.strictEqual(miioSocket.codec.token.equals(token), true);
    });

    it("keeps following the sender when peer restriction is off", () => {
        const {udp, miioSocket} = createSocket(false);
        const sender = {address: "192.168.1.50", port: 6000};

        udp.emit("message", response(7), sender);

        assert.deepStrictEqual(miioSocket.rinfo, sender);
    });

    it("does not treat inherited object properties as pending requests", () => {
        const {udp} = createSocket(true);

        for (const id of ["__proto__", "constructor", "toString"]) {
            assert.doesNotThrow(() => {
                udp.emit("message", response(id), Object.assign({}, peer));
            });
        }
    });
});
