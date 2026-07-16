/**
 * Patches node_modules packages that use the "module-sync" export condition.
 *
 * Node.js v22 supports "module-sync" which resolves require() calls to .mjs
 * files. pkg (the binary bundler) cannot handle this because:
 *   1. .mjs files end up as assets outside the snapshot filesystem
 *   2. The .mjs files then import ./index.js via ESM, which can't resolve
 *      back into the snapshot
 *
 * Fix: Remove the "module-sync" condition so require() falls back to the
 * "default" condition (CJS ./index.js) which pkg handles natively.
 *
 * Only patches packages in the backend's dependency tree that are actually
 * bundled by pkg. Frontend-only packages (react-router, etc.) are handled
 * by webpack and are unaffected.
 */

const fs = require("fs");
const path = require("path");

const PACKAGES_TO_PATCH = [
    "generator-function",
    "async-function",
];

let patched = 0;

for (const pkg of PACKAGES_TO_PATCH) {
    const pkgJsonPath = path.join(__dirname, "..", "node_modules", pkg, "package.json");

    if (!fs.existsSync(pkgJsonPath)) {
        console.log(`[patch_pkg_module_sync] Skipping ${pkg} (not installed)`);
        continue;
    }

    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
    const exports = pkgJson.exports;

    if (!exports || !exports["."]) {
        console.log(`[patch_pkg_module_sync] Skipping ${pkg} (no exports["."])`);
        continue;
    }

    let modified = false;
    const dotExport = exports["."];

    if (Array.isArray(dotExport)) {
        for (const entry of dotExport) {
            if (typeof entry === "object" && entry !== null && "module-sync" in entry) {
                delete entry["module-sync"];
                modified = true;
            }
        }
    } else if (typeof dotExport === "object" && dotExport !== null && "module-sync" in dotExport) {
        delete dotExport["module-sync"];
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + "\n");
        console.log(`[patch_pkg_module_sync] Patched ${pkg}`);
        patched++;
    } else {
        console.log(`[patch_pkg_module_sync] Skipping ${pkg} (no module-sync found)`);
    }
}

console.log(`[patch_pkg_module_sync] Done. Patched ${patched} package(s).`);
