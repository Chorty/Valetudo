#!/usr/bin/env node

const {
    DEFAULTS,
    parseArguments,
    runProfile,
    writeResults
} = require("./vacuum_resource_profiler");

function printHelp() {
    process.stdout.write(`Usage: npm run profile_vacuum_resources -- [options]\n\n` +
        `Options:\n` +
        `  --ssh-host HOST       SSH config host (default: ${DEFAULTS.sshHost})\n` +
        `  --http-base URL       Valetudo HTTP base (default: ${DEFAULTS.httpBase})\n` +
        `  --label LABEL         Scenario label (default: ${DEFAULTS.label})\n` +
        `  --duration SECONDS    Profile duration (default: ${DEFAULTS.duration})\n` +
        `  --interval SECONDS    Sampling interval (default: ${DEFAULTS.interval})\n` +
        `  --timeout MS          Per-request timeout (default: ${DEFAULTS.timeout})\n` +
        `  --output DIRECTORY    Results root (default: ${DEFAULTS.output})\n` +
        `  --help                Show this help\n`);
}

async function main() {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) {
        printHelp();
        return;
    }

    process.stdout.write(`Profiling ${options.label} for ${options.duration} seconds. Results stay on this Mac.\n`);
    const result = await runProfile(options);
    const directory = writeResults(options, result);
    process.stdout.write(`Profile complete: ${directory}\n`);
    process.stdout.write(`Root HTTP failures: ${result.summary.http.root.failures}; p95: ${result.summary.http.root.p95Ms?.toFixed(1) ?? "n/a"} ms\n`);
}

main().catch(error => {
    process.stderr.write(`Profiler failed: ${error.message}\n`);
    process.exitCode = 1;
});
