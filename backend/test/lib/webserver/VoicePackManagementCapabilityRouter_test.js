const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

const VoicePackManagementCapabilityRouter = require("../../../lib/webserver/capabilityRouters/VoicePackManagementCapabilityRouter");

const isAllowed = VoicePackManagementCapabilityRouter.IS_ALLOWED_VOICE_PACK_URL;

describe("VoicePackManagementCapabilityRouter", () => {
    describe("IS_ALLOWED_VOICE_PACK_URL", () => {
        it("allows http(s) packs on the LAN and the internet", () => {
            for (const url of [
                "http://host_or_ip/custom.tar.gz",
                "http://192.168.1.50:8000/voice.tar.gz",
                "http://10.0.0.2/voice.tar.gz",
                "https://example.com/packs/voice.tar.gz",
                "http://nas.local/voice.tar.gz",
                "http://[2001:db8::1]/voice.tar.gz",
            ]) {
                assert.equal(isAllowed(url), true, url);
            }
        });

        it("refuses the robot's own loopback in every spelling the parser accepts", () => {
            for (const url of [
                "http://127.0.0.1:1984/api/streams",
                "http://127.1/",
                "http://2130706433/",
                "http://0x7f.0.0.1/",
                "http://localhost/",
                "http://LOCALHOST./",
                "http://go2rtc.localhost/",
                "http://0.0.0.0/",
                "http://[::1]/",
                "http://[::]/",
                "http://[::ffff:127.0.0.1]/",
            ]) {
                assert.equal(isAllowed(url), false, url);
            }
        });

        it("refuses link-local addresses", () => {
            for (const url of ["http://169.254.169.254/latest/meta-data", "http://[fe80::1]/"]) {
                assert.equal(isAllowed(url), false, url);
            }
        });

        it("refuses other schemes, embedded credentials and unparsable input", () => {
            for (const url of [
                "file:///data/valetudo_config.json",
                "ftp://192.168.1.50/voice.tar.gz",
                "http://user:pass@192.168.1.50/voice.tar.gz",
                "not a url",
                "",
            ]) {
                assert.equal(isAllowed(url), false, url);
            }
        });
    });
});
