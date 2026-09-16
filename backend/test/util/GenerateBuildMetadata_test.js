const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

const { GET_COMMIT_ID, GET_VALETUDO_VERSION } = require("../../../util/generate_build_metadata");

describe("generate_build_metadata", () => {
    describe("GET_COMMIT_ID", () => {
        it("resolves HEAD through git rev-parse", () => {
            const calls = [];
            const commitId = GET_COMMIT_ID({
                rootDirectory: "/some/repo",
                execFileSync: (command, args, opts) => {
                    calls.push({ command: command, args: args, opts: opts });
                    return "abc123\n";
                }
            });

            assert.equal(commitId, "abc123");
            assert.deepEqual(calls, [{
                command: "git",
                args: ["rev-parse", "HEAD"],
                opts: { cwd: "/some/repo", encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }
            }]);
        });

        it("works the same for any branch, not just master", () => {
            // The old implementation only special-cased refs/heads/master and left
            // every other branch as the literal unresolved "ref: refs/heads/..." text.
            const commitId = GET_COMMIT_ID({
                execFileSync: () => "def456\n"
            });

            assert.equal(commitId, "def456");
        });

        it("falls back to \"unknown\" when git is unavailable, e.g. a worktree quirk or no .git at all", () => {
            const commitId = GET_COMMIT_ID({
                execFileSync: () => {
                    throw new Error("spawn git ENOENT");
                }
            });

            assert.equal(commitId, "unknown");
        });
    });

    describe("GET_VALETUDO_VERSION", () => {
        it("reads the version out of package.json", () => {
            const version = GET_VALETUDO_VERSION({
                readFile: () => JSON.stringify({ version: "2026.07.0" })
            });

            assert.equal(version, "2026.07.0");
        });

        it("falls back to \"unknown\" when package.json cannot be read", () => {
            const version = GET_VALETUDO_VERSION({
                readFile: () => {
                    throw new Error("ENOENT");
                }
            });

            assert.equal(version, "unknown");
        });
    });
});
