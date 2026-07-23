const fs = require("fs");
const path = require("path");

/**
 * Serves precompressed variants of immutable, content-hashed frontend assets.
 *
 * @param {object} options
 * @param {string} options.root
 * @returns {(function(*, *, *): void)}
 */
module.exports = function(options) {
    const root = path.resolve(options.root);

    return function precompressedStaticMiddleware(req, res, next) {
        if (req.method !== "GET" && req.method !== "HEAD") {
            next();
            return;
        }

        const originalPath = resolveAssetPath(root, req.path);
        if (!originalPath) {
            res.sendStatus(400);
            return;
        }

        const encoding = selectEncoding(req.headers["accept-encoding"]);
        const encodedPath = encoding ? `${originalPath}.${encoding === "br" ? "br" : "gz"}` : null;
        if (!encodedPath || !isRegularFile(originalPath) || !isRegularFile(encodedPath)) {
            if (isRegularFile(`${originalPath}.br`) || isRegularFile(`${originalPath}.gz`)) {
                res.vary("Accept-Encoding");
            }
            next();
            return;
        }

        res.type(originalPath);
        res.set("Content-Encoding", encoding);
        res.vary("Accept-Encoding");
        res.set("Cache-Control", "public, max-age=31536000, immutable");
        res.sendFile(encodedPath);
    };
};

function resolveAssetPath(root, requestPath) {
    let decoded;
    try {
        decoded = decodeURIComponent(requestPath);
    } catch {
        return null;
    }
    if (decoded.includes("\\") || decoded.includes("\0")) {
        return null;
    }
    const segments = decoded.split("/").filter(Boolean);
    if (segments.some(segment => segment === "." || segment === "..")) {
        return null;
    }
    const resolved = path.resolve(root, ...segments);
    return resolved === root || resolved.startsWith(root + path.sep) ? resolved : null;
}

function selectEncoding(header) {
    if (!header) {
        return null;
    }
    const encodings = String(header).split(",").map(item => {
        const [name, ...parameters] = item.trim().toLowerCase().split(";");
        let quality = 1;
        for (const parameter of parameters) {
            const match = /^q=(0(?:\.\d+)?|1(?:\.0+)?)$/.exec(parameter.trim());
            if (match) {
                quality = Number(match[1]);
            }
        }
        return {name: name, quality: quality};
    });
    const acceptable = name => encodings.some(value => value.name === name && value.quality > 0);
    if (acceptable("br")) {
        return "br";
    }
    if (acceptable("gzip")) {
        return "gzip";
    }
    return null;
}

function isRegularFile(filePath) {
    try {
        return fs.statSync(filePath).isFile();
    } catch {
        return false;
    }
}

module.exports.resolveAssetPath = resolveAssetPath;
module.exports.selectEncoding = selectEncoding;
