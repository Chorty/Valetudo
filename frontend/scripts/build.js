process.env.BABEL_ENV = 'production';
process.env.NODE_ENV = 'production';
process.env.GENERATE_SOURCEMAP = 'false';

const chalk = require('react-dev-utils/chalk');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const webpack = require('webpack');
const configFactory = require('../config/webpack.config');
const paths = require('../config/paths');
const checkRequiredFiles = require('react-dev-utils/checkRequiredFiles');
const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages');
const FileSizeReporter = require('react-dev-utils/FileSizeReporter');

const measureFileSizesBeforeBuild = FileSizeReporter.measureFileSizesBeforeBuild;
const printFileSizesAfterBuild = FileSizeReporter.printFileSizesAfterBuild;

const WARN_AFTER_BUNDLE_GZIP_SIZE = 512 * 1024;
const WARN_AFTER_CHUNK_GZIP_SIZE = 1024 * 1024;
const MAX_MAIN_GZIP_SIZE = 420 * 1024;
const MAX_ASYNC_CHUNK_GZIP_SIZE = 512 * 1024;
const PRECOMPRESS_MINIMUM_SIZE = 1024;
const PRECOMPRESS_EXTENSIONS = new Set(['.css', '.js', '.json', '.svg']);

if (!checkRequiredFiles([paths.appHtml, paths.appIndexJs])) {
    process.exit(1);
}

const argv = process.argv.slice(2);
const writeStatsJson = argv.indexOf('--stats') !== -1;
const config = configFactory('production');

measureFileSizesBeforeBuild(paths.appBuild)
    .then(previousFileSizes => {
        console.log(chalk.cyan('Creating an optimized production build...'));

        fs.rmSync(paths.appBuild, { recursive: true, force: true });
        fs.mkdirSync(paths.appBuild, { recursive: true });

        copyPublicFolder();

        return build(previousFileSizes);
    })
    .then(
        ({ stats, previousFileSizes, warnings }) => {
            const compressedAssets = precompressBuildAssets(paths.appBuild);
            enforceBundleBudgets(paths.appBuild);

            if (warnings.length) {
                console.log(chalk.yellow('Compiled with warnings.\n'));
                console.log(warnings.join('\n\n'));
            } else {
                console.log(chalk.green('Compiled successfully.\n'));
            }
            console.log(chalk.green(`Created ${compressedAssets} precompressed asset variants.\n`));

            console.log('File sizes after gzip:\n');
            printFileSizesAfterBuild(
                stats,
                previousFileSizes,
                paths.appBuild,
                WARN_AFTER_BUNDLE_GZIP_SIZE,
                WARN_AFTER_CHUNK_GZIP_SIZE
            );
            console.log();
        },
        err => {
            console.log(chalk.red('Failed to compile.\n'));
            console.log((err.message || err) + '\n');
            process.exit(1);
        }
    );

function build(previousFileSizes) {
    const compiler = webpack(config);
    return new Promise((resolve, reject) => {
        compiler.run((err, stats) => {
            let messages;

            if (err) {
                if (!err.message) {
                    return reject(err);
                }
                messages = formatWebpackMessages({
                    errors: [err.message],
                    warnings: [],
                });
            } else {
                messages = formatWebpackMessages(
                    stats.toJson({ all: false, warnings: true, errors: true })
                );
            }

            if (messages.errors.length) {
                if (messages.errors.length > 1) {
                    messages.errors.length = 1;
                }
                return reject(new Error(messages.errors.join('\n\n')));
            }

            const resolveArgs = {
                stats,
                previousFileSizes,
                warnings: messages.warnings,
            };

            if (writeStatsJson) {
                const statsJson = stats.toJson();
                fs.writeFileSync(paths.appBuild + '/bundle-stats.json', JSON.stringify(statsJson, null, 2));
                console.log(chalk.green(`Stats file generated at ${paths.appBuild}/bundle-stats.json`));
            }

            return resolve(resolveArgs);
        });
    });
}

function precompressBuildAssets(buildDirectory) {
    let count = 0;
    for (const filePath of walkFiles(buildDirectory)) {
        const relative = path.relative(buildDirectory, filePath);
        const isHashedStaticAsset = relative.startsWith(`static${path.sep}`) &&
            /\.[a-f0-9]{8,}(?:\.chunk)?\.(?:css|js|json|svg)$/.test(path.basename(filePath));
        if (!isHashedStaticAsset || !PRECOMPRESS_EXTENSIONS.has(path.extname(filePath)) || fs.statSync(filePath).size < PRECOMPRESS_MINIMUM_SIZE) {
            continue;
        }
        const contents = fs.readFileSync(filePath);
        fs.writeFileSync(`${filePath}.br`, zlib.brotliCompressSync(contents, {
            params: {[zlib.constants.BROTLI_PARAM_QUALITY]: 9}
        }));
        fs.writeFileSync(`${filePath}.gz`, zlib.gzipSync(contents, {level: 9}));
        count += 2;
    }
    return count;
}

function enforceBundleBudgets(buildDirectory) {
    const javascriptDirectory = path.join(buildDirectory, 'static', 'js');
    const files = fs.readdirSync(javascriptDirectory);
    const main = files.find(file => /^main\.[a-f0-9]+\.js\.gz$/.test(file));
    if (!main) {
        throw new Error('Unable to find the compressed main JavaScript bundle for budget validation.');
    }
    const mainSize = fs.statSync(path.join(javascriptDirectory, main)).size;
    if (mainSize > MAX_MAIN_GZIP_SIZE) {
        throw new Error(`Main bundle budget exceeded: ${formatBytes(mainSize)} > ${formatBytes(MAX_MAIN_GZIP_SIZE)}`);
    }
    for (const file of files.filter(file => file.endsWith('.chunk.js.gz'))) {
        const size = fs.statSync(path.join(javascriptDirectory, file)).size;
        if (size > MAX_ASYNC_CHUNK_GZIP_SIZE) {
            throw new Error(`Async chunk budget exceeded for ${file}: ${formatBytes(size)} > ${formatBytes(MAX_ASYNC_CHUNK_GZIP_SIZE)}`);
        }
    }
}

function walkFiles(directory) {
    return fs.readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
        const entryPath = path.join(directory, entry.name);
        return entry.isDirectory() ? walkFiles(entryPath) : [entryPath];
    });
}

function formatBytes(bytes) {
    return `${(bytes / 1024).toFixed(2)} KiB`;
}

function copyPublicFolder() {
    fs.cpSync(paths.appPublic, paths.appBuild, {
        recursive: true,
        dereference: true,
        filter: (source) => source !== paths.appHtml,
    });
}
