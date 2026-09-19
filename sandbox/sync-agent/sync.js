import "dotenv/config";
import chokidar from 'chokidar';
import {
    S3Client,
    GetObjectCommand,
    PutObjectCommand,
    DeleteObjectCommand,
    ListObjectsV2Command,
    DeleteObjectsCommand
} from '@aws-sdk/client-s3';
import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';

// ---------------------------------------------------------------------------
// sync-agent
//
// On startup it reconciles the workspace with S3 (local files S3 has never
// seen are uploaded; every S3 object under the project prefix is downloaded
// into localDirectory, restoring the project's last session), then watches
// localDirectory and mirrors every change into the shared S3 bucket under the
// project's own prefix, so files of multiple projects can safely live in the
// same bucket:
//
//   ./workspace/index.html             -> s3://<bucket>/<PROJECT_ID>/index.html
//   ./workspace/src/components/App.jsx -> s3://<bucket>/<PROJECT_ID>/src/components/App.jsx
//
// Required env vars:
//   PROJECT_ID              unique project id (used as the S3 key prefix)
//   AWS_REGION              e.g. ap-south-1
//   AWS_ACCESS_KEY_ID       AWS credentials
//   AWS_SECRET_ACCESS_KEY
//
// Optional env vars:
//   S3_BUCKET               defaults to "credscoop-bucket"
//   S3_FORCE_PATH_STYLE     set to "true" when pointing at a local
//                           S3-compatible endpoint (LocalStack / MinIO)
//   AWS_ENDPOINT_URL_S3     custom S3 endpoint for local testing
// ---------------------------------------------------------------------------

const projectId = process.env.PROJECT_ID;
const bucketName = process.env.S3_BUCKET || "credscoop-bucket";
const localDirectory = path.resolve('./workspace');
const s3Prefix = `${projectId}/`;

// Fail fast if the agent is misconfigured instead of failing on every upload.
for (const [name, value] of Object.entries({
    PROJECT_ID: projectId,
    AWS_REGION: process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
})) {
    if (!value) {
        console.error(`[sync-agent] Missing required env var: ${name}`);
        process.exit(1);
    }
}

// The watch target must exist or chokidar fails on startup.
if (!existsSync(localDirectory)) {
    mkdirSync(localDirectory, { recursive: true });
}

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true"
});

// Keeps S3 objects servable by a web preview without pulling in a mime library.
const MIME_TYPES = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
    '.mjs': 'text/javascript', '.jsx': 'text/javascript', '.ts': 'text/plain',
    '.tsx': 'text/plain', '.json': 'application/json', '.txt': 'text/plain',
    '.md': 'text/markdown', '.xml': 'application/xml', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon',
    '.pdf': 'application/pdf', '.wasm': 'application/wasm',
    '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
    '.yml': 'text/yaml', '.yaml': 'text/yaml'
};

function getContentType(filePath) {
    return MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

// Workspace-relative path with forward slashes — used for S3 keys and for
// comparing S3 listings against local files.
function getRelativePath(filePath) {
    return path.relative(localDirectory, filePath).split(path.sep).join('/');
}

// Builds the S3 key for a local file: "<projectId>/<relative-path>"
function getS3Key(filePath) {
    const relativePath = getRelativePath(filePath);
    if (!relativePath || relativePath.startsWith('..')) {
        throw new Error(`Path "${filePath}" is outside ${localDirectory}`);
    }
    return `${s3Prefix}${relativePath}`;
}

// ---------------------------------------------------------------------------
// Upload / delete helpers
// ---------------------------------------------------------------------------

async function uploadFile(filePath) {
    const key = getS3Key(filePath);
    const body = createReadStream(filePath);
    try {
        await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: body,
            ContentType: getContentType(filePath)
        }));
        console.log(`[sync-agent] Uploaded s3://${bucketName}/${key}`);
    } catch (error) {
        console.error(`[sync-agent] Failed to upload ${key}:`, error.message ?? error);
        body.destroy();
    }
}

async function deleteObject(key) {
    try {
        await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
        console.log(`[sync-agent] Deleted s3://${bucketName}/${key}`);
    } catch (error) {
        console.error(`[sync-agent] Failed to delete ${key}:`, error.message ?? error);
    }
}

async function deleteFile(filePath) {
    try {
        await deleteObject(getS3Key(filePath));
    } catch (error) {
        // getS3Key throws for paths outside the watched directory — nothing to sync then.
        console.error(`[sync-agent] Cannot map ${filePath} to an S3 key:`, error.message ?? error);
    }
}

// When a directory is removed, delete every object stored under its prefix.
async function deleteDirectory(dirPath) {
    const relativePath = getRelativePath(dirPath);
    const prefix = `${s3Prefix}${relativePath}/`;
    try {
        let continuationToken;
        do {
            const listResult = await s3Client.send(new ListObjectsV2Command({
                Bucket: bucketName,
                Prefix: prefix,
                MaxKeys: 1000,
                ContinuationToken: continuationToken
            }));

            const objects = (listResult.Contents ?? []).map((object) => ({ Key: object.Key }));
            if (objects.length > 0) {
                await s3Client.send(new DeleteObjectsCommand({
                    Bucket: bucketName,
                    Delete: { Objects: objects, Quiet: true }
                }));
                console.log(`[sync-agent] Deleted ${objects.length} object(s) under s3://${bucketName}/${prefix}`);
            }

            continuationToken = listResult.IsTruncated ? listResult.NextContinuationToken : undefined;
        } while (continuationToken);
    } catch (error) {
        console.error(`[sync-agent] Failed to delete objects under ${prefix}:`, error.message ?? error);
    }
}

// ---------------------------------------------------------------------------
// Initial sync (startup reconcile)
//
// Compares the workspace against S3 under the project prefix so a (re)started
// sandbox always ends up complete:
//   - local file S3 has never seen -> uploaded to S3
//   - S3 object under the prefix   -> downloaded into localDirectory
//     (S3 wins on conflicts — this is what restores the previous session
//     into a freshly-seeded workspace volume)
// ---------------------------------------------------------------------------

const INITIAL_SYNC_CONCURRENCY = 8;

// Workspace files written by the initial download. Chokidar would otherwise
// fire 'add' for them and echo the identical content straight back to S3.
const initialSyncSkips = new Set();

// Lists every object under "<projectId>/" as a Map of workspace-relative
// paths -> S3 object metadata.
async function listS3Files() {
    const files = new Map();
    let continuationToken;
    do {
        const result = await s3Client.send(new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: s3Prefix,
            MaxKeys: 1000,
            ContinuationToken: continuationToken
        }));

        for (const object of result.Contents ?? []) {
            const relativePath = object.Key.slice(s3Prefix.length);
            // Skip S3 "folder" placeholders and anything escaping the workspace.
            if (!relativePath || relativePath.endsWith('/') || relativePath.split('/').includes('..')) {
                continue;
            }
            files.set(relativePath, object);
        }

        continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
    } while (continuationToken);
    return files;
}

// Recursively collects workspace files, pruning the directories the watcher
// ignores (node_modules, .git).
function listLocalFiles(dir, output = []) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            listLocalFiles(fullPath, output);
        } else if (entry.isFile()) {
            output.push(fullPath);
        }
    }
    return output;
}

// Runs async tasks over a list with a bounded number of parallel workers.
async function runWithConcurrency(items, limit, task) {
    const queue = [...items];
    const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
        while (queue.length > 0) {
            await task(queue.shift());
        }
    });
    await Promise.all(workers);
}

// Streams one S3 object into the workspace under its relative path.
async function downloadS3File(relativePath) {
    const key = `${s3Prefix}${relativePath}`;
    const destination = path.join(localDirectory, relativePath);
    initialSyncSkips.add(destination); // suppress the watcher's echo upload
    try {
        const { Body } = await s3Client.send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
        mkdirSync(path.dirname(destination), { recursive: true });
        await pipeline(Body, createWriteStream(destination));
        console.log(`[sync-agent] Downloaded s3://${bucketName}/${key} -> ${destination}`);
    } catch (error) {
        initialSyncSkips.delete(destination);
        console.error(`[sync-agent] Failed to download ${key}:`, error.message ?? error);
    }
}

async function initialSync() {
    const s3Files = await listS3Files();
    const localFiles = listLocalFiles(localDirectory);

    // Any local file S3 has never seen gets uploaded; every object stored
    // under the project prefix is written back into the workspace. S3 is the
    // source of truth when the workspace is rebuilt — this is what restores a
    // project's previous session into a freshly-seeded sandbox volume.
    const toUpload = localFiles.filter((filePath) => !s3Files.has(getRelativePath(filePath)));
    const toDownload = [...s3Files.keys()];

    console.log(
        `[sync-agent] Initial sync: ${toUpload.length} local file(s) to upload, ` +
        `${toDownload.length} S3 object(s) to download.`
    );

    await runWithConcurrency(toUpload, INITIAL_SYNC_CONCURRENCY, (filePath) => uploadFile(filePath));
    await runWithConcurrency(toDownload, INITIAL_SYNC_CONCURRENCY, (relativePath) => downloadS3File(relativePath));
}

// ---------------------------------------------------------------------------
// Watcher
// ---------------------------------------------------------------------------

// One in-flight upload per file: if more changes arrive while a file is being
// uploaded, a single follow-up upload picks up the latest content (dirty flag).
const activeUploads = new Map();

function syncFile(filePath) {
    // First event for a file the initial sync just downloaded: skip the echo
    // upload of identical content.
    if (initialSyncSkips.delete(filePath)) return;

    const state = activeUploads.get(filePath);
    if (state) {
        state.dirty = true;
        return;
    }

    activeUploads.set(filePath, { dirty: false });
    uploadFile(filePath).finally(() => {
        const { dirty } = activeUploads.get(filePath);
        activeUploads.delete(filePath);
        if (dirty) syncFile(filePath);
    });
}

const watcher = chokidar.watch(localDirectory, {
    ignoreInitial: true, // pre-existing files are reconciled by initialSync()
    ignored: (filePath) => /(^|[/\\])(node_modules|\.git)([/\\]|$)/.test(filePath),
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
    ignorePermissionErrors: true
});

watcher
    .on('add', (filePath) => syncFile(filePath))
    .on('change', (filePath) => syncFile(filePath))
    .on('unlink', (filePath) => deleteFile(filePath))
    .on('unlinkDir', (dirPath) => deleteDirectory(dirPath))
    .on('error', (error) => console.error('[sync-agent] Watcher error:', error))
    .on('ready', () => {
        console.log(`[sync-agent] Watching ${localDirectory}`);
        console.log(`[sync-agent] Syncing to s3://${bucketName}/${s3Prefix} (project "${projectId}")`);
    });

// Reconcile pre-existing workspace/S3 state once the watcher is running.
const initialSyncPromise = initialSync().catch((error) => {
    console.error('[sync-agent] Initial sync failed:', error.message ?? error);
});

initialSyncPromise.then(() => {
    console.log('[sync-agent] Initial sync complete — watching for changes.');
});

// Clean shutdown so the watcher never keeps the container from exiting.
let isShuttingDown = false;
async function shutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`[sync-agent] Received ${signal}, closing watcher...`);
    try {
        await watcher.close();
    } finally {
        process.exit(0);
    }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));