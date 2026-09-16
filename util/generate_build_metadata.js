const fs = require('fs');
const path = require("path");

/**
 * @param {object} [options]
 * @param {(path: string, options: object) => string} [options.readFile]
 * @returns {string}
 */
function GET_VALETUDO_VERSION(options = {}) {
    const readFile = options.readFile ?? ((filePath, opts) => fs.readFileSync(filePath, opts));
    let valetudoVersion = "unknown";

    try {
        const rootDirectory = path.resolve(__dirname, "..");
        const packageContent = readFile(rootDirectory + "/package.json", {"encoding": "utf-8"});

        if (packageContent) {
            valetudoVersion = JSON.parse(packageContent.toString()).version;
        }
    } catch (e) {
        //intentional
    }

    return valetudoVersion;
}

/**
 * Resolves the currently checked-out commit via `git rev-parse HEAD` rather than
 * reading .git/HEAD by hand, which only ever resolved the ref for the master
 * branch: any other branch was left as the literal unresolved "ref: refs/heads/..."
 * string, and a worktree checkout (where .git is a file, not a directory) failed
 * to read at all and silently fell back to "unknown". `git rev-parse` handles
 * both of those, along with packed refs and detached HEAD, uniformly.
 *
 * @param {object} [options]
 * @param {(command: string, args: Array<string>, options: object) => string} [options.execFileSync]
 * @param {string} [options.rootDirectory]
 * @returns {string}
 */
function GET_COMMIT_ID(options = {}) {
    const execFileSync = options.execFileSync ?? require("child_process").execFileSync;
    const rootDirectory = options.rootDirectory ?? path.resolve(__dirname, "..");
    let commitId = "unknown";

    try {
        commitId = execFileSync("git", ["rev-parse", "HEAD"], {
            cwd: rootDirectory,
            encoding: "utf-8",
            stdio: ["ignore", "pipe", "ignore"]
        }).trim();
    } catch (e) {
        //intentional
    }

    return commitId;
}

if (require.main === module) {
    const metadata = {
        version: GET_VALETUDO_VERSION(),
        commit:  GET_COMMIT_ID(),
        buildTimestamp: new Date().toISOString(),
    };

    fs.writeFileSync(
        path.join(__dirname, "../backend/lib/res/build_metadata.json"),
        JSON.stringify(metadata)
    );
}

module.exports = {
    GET_VALETUDO_VERSION: GET_VALETUDO_VERSION,
    GET_COMMIT_ID: GET_COMMIT_ID,
};
